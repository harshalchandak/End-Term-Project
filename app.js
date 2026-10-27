(() => {
  'use strict';
  const STORAGE_KEY = 'studysprint.v1';
  const DAY = 86400000;
  const $ = (selector) => document.querySelector(selector);
  const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const dateOffset = (days) => { const date = new Date(); date.setDate(date.getDate() + days); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const makeSeed = () => ({
    tasks: [
      { id: crypto.randomUUID(), title: 'Review chapter 4 — Cell Biology', subject: 'Biology', dueDate: dateOffset(0), effort: 60, priority: 'high', completed: false, createdAt: Date.now() - 300000 },
      { id: crypto.randomUUID(), title: 'Finish problem set 6', subject: 'Mathematics', dueDate: dateOffset(1), effort: 90, priority: 'medium', completed: false, createdAt: Date.now() - 200000 },
      { id: crypto.randomUUID(), title: 'Prepare history presentation outline', subject: 'History', dueDate: dateOffset(3), effort: 60, priority: 'low', completed: false, createdAt: Date.now() - 100000 },
    ], sessions: [], focusMinutes: 25, selectedTaskId: null,
  });
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.tasks) && Array.isArray(saved.sessions)) return { ...makeSeed(), ...saved };
    } catch (error) { console.warn('StudySprint could not read saved data:', error); }
    const initial = makeSeed();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(initial)); } catch (error) { console.warn('StudySprint storage is unavailable:', error); }
    return initial;
  }
  let state = loadState();
  let activeFilter = 'all';
  let showAll = false;
  let duration = (Number(state.focusMinutes) === 50 ? 50 : 25) * 60;
  let remaining = duration;
  let timer = null;
  let running = false;
  let toastTimer;

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { console.error('Could not save StudySprint data:', error); toast('Storage is full or unavailable. Export your data to keep a backup.'); }
  }
  function toast(message) {
    const box = $('#toast'); box.textContent = message; box.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('show'), 2600);
  }
  function urgencyDays(task) {
    const toDayNumber = (value) => { const [year, month, day] = value.split('-').map(Number); return Date.UTC(year, month - 1, day) / DAY; };
    return toDayNumber(task.dueDate) - toDayNumber(todayISO());
  }
  function score(task) {
    const days = urgencyDays(task);
    const urgency = days < 0 ? 100 + Math.min(Math.abs(days) * 3, 30) : days === 0 ? 85 : days === 1 ? 68 : days <= 3 ? 48 : days <= 7 ? 28 : 12;
    const importance = { high: 28, medium: 16, low: 5 }[task.priority] || 0;
    const effortBoost = task.effort <= 30 ? 10 : task.effort <= 60 ? 6 : task.effort <= 90 ? 2 : 0;
    return urgency + importance + effortBoost;
  }
  function prettyDate(dateString) {
    const days = urgencyDays({ dueDate: dateString });
    if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due ${new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  function visibleTasks() {
    let tasks = state.tasks.filter((task) => {
      if (activeFilter === 'today') return !task.completed && task.dueDate <= todayISO();
      if (activeFilter === 'upcoming') return !task.completed && task.dueDate > todayISO();
      if (activeFilter === 'done') return task.completed;
      return true;
    });
    tasks.sort((a, b) => Number(a.completed) - Number(b.completed) || score(b) - score(a) || a.dueDate.localeCompare(b.dueDate));
    return showAll ? tasks : tasks.slice(0, 5);
  }
  function renderTasks() {
    const list = $('#task-list');
    const tasks = visibleTasks();
    if (!tasks.length) {
      const done = activeFilter === 'done';
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">${done ? '✓' : '✳'}</div><strong>${done ? 'Your wins will show up here.' : 'A clear space to start.'}</strong><p>${done ? 'Complete a task and celebrate the progress.' : 'Add a task and we’ll help you find the next step.'}</p></div>`;
      return;
    }
    list.innerHTML = tasks.map((task) => {
      const days = urgencyDays(task);
      const dueClass = days <= 0 ? 'urgent' : days === 1 ? 'today' : '';
      return `<article class="task-row ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <button class="task-check" type="button" data-action="complete" aria-label="${task.completed ? 'Mark incomplete' : 'Complete task'}">${task.completed ? '✓' : ''}</button>
        <div class="task-info"><button class="task-name-button" type="button" data-action="focus" title="Focus on ${escapeHTML(task.title)}">${escapeHTML(task.title)}</button><div class="task-meta"><span class="subject-tag">${escapeHTML(task.subject)}</span><span class="due-label ${dueClass}">◷ ${prettyDate(task.dueDate)}</span></div></div>
        <div class="task-side"><span class="priority-tag priority-${task.priority}">${task.priority[0].toUpperCase()}${task.priority.slice(1)}</span><span class="task-duration">${task.effort >= 60 ? `${task.effort / 60}h` : `${task.effort}m`}</span><button class="task-delete" type="button" data-action="delete" title="Delete task" aria-label="Delete ${escapeHTML(task.title)}">×</button></div>
      </article>`;
    }).join('');
  }
  function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function renderStats() {
    const open = state.tasks.filter((task) => !task.completed);
    const due = open.filter((task) => task.dueDate <= todayISO()).length;
    $('#open-stat').textContent = open.length;
    $('#nav-count').textContent = open.length;
    $('#due-stat').textContent = due ? `${due} ${due === 1 ? 'task' : 'tasks'} due today or overdue` : 'Nothing due today';
    const now = new Date(); const weekStart = new Date(now); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const minutes = state.sessions.filter((session) => session.completedAt >= weekStart.getTime()).reduce((sum, session) => sum + session.minutes, 0);
    $('#focus-stat').textContent = minutes;
    $('#goal-stat').textContent = Math.min(minutes, 300);
    const percent = Math.min(100, Math.round(minutes / 300 * 100));
    $('#goal-percent').textContent = `${percent}%`; $('#goal-bar').style.width = `${percent}%`;
    $('#progress-ring').style.background = `conic-gradient(#64a477 ${percent * 3.6}deg, #e8f1e8 0deg)`;
    $('#focus-note').textContent = minutes ? `${Math.floor(minutes / 25)} focused ${Math.floor(minutes / 25) === 1 ? 'session' : 'sessions'} this week` : 'Start a session to build your streak';
  }
  function render() { renderTasks(); renderStats(); }
  function openDialog(task) {
    const form = $('#task-form'); form.reset(); $('#form-error').textContent = '';
    $('#dialog-title').textContent = task ? 'Edit task' : 'Add a task'; $('#save-task').innerHTML = task ? 'Save changes <span>→</span>' : 'Add task <span>→</span>';
    $('#task-title').value = task?.title || ''; $('#task-subject').value = task?.subject || '';
    $('#task-date').value = task?.dueDate || todayISO(); $('#task-effort').value = String(task?.effort || 60); $('#task-priority').value = task?.priority || 'medium';
    $('#task-dialog').dataset.editId = task?.id || ''; $('#task-dialog').showModal(); $('#task-title').focus();
  }
  function closeDialog() { $('#task-dialog').close(); }
  function setTimerDisplay() {
    const mins = Math.floor(remaining / 60).toString().padStart(2, '0'); const secs = (remaining % 60).toString().padStart(2, '0');
    $('#timer-display').innerHTML = `${mins}<span>:</span>${secs}`;
    $('#timer-button').innerHTML = running ? 'Pause session <span>Ⅱ</span>' : (remaining < duration ? 'Resume session <span>→</span>' : 'Start focusing <span>→</span>');
    $('#timer-mode-label').textContent = state.selectedTaskId ? `Working on ${state.tasks.find((task) => task.id === state.selectedTaskId)?.title || 'your task'}` : `${Math.round(duration / 60)} min focus session`;
  }
  function finishSession() {
    running = false; clearInterval(timer); timer = null;
    state.sessions.push({ id: crypto.randomUUID(), minutes: Math.round(duration / 60), completedAt: Date.now(), taskId: state.selectedTaskId });
    save(); remaining = duration; setTimerDisplay(); renderStats(); toast('Focus session complete. Nice work!');
  }
  function toggleTimer() {
    if (running) { running = false; clearInterval(timer); timer = null; setTimerDisplay(); return; }
    running = true; setTimerDisplay();
    timer = setInterval(() => { remaining -= 1; setTimerDisplay(); if (remaining <= 0) finishSession(); }, 1000);
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `studysprint-backup-${todayISO()}.json`; link.click(); URL.revokeObjectURL(link.href); toast('Your StudySprint backup has been downloaded.');
  }

  $('#today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const hour = new Date().getHours(); $('#greeting').textContent = hour < 12 ? 'GOOD MORNING, HARSHAL' : hour < 18 ? 'GOOD AFTERNOON, HARSHAL' : 'GOOD EVENING, HARSHAL';
  document.querySelectorAll('#add-task-top, #add-task-inline').forEach((button) => button.addEventListener('click', () => openDialog()));
  $('#close-dialog').addEventListener('click', closeDialog); $('#cancel-dialog').addEventListener('click', closeDialog);
  $('#task-dialog').addEventListener('click', (event) => { if (event.target === $('#task-dialog')) closeDialog(); });
  $('#task-form').addEventListener('submit', (event) => {
    event.preventDefault(); const title = $('#task-title').value.trim(); const subject = $('#task-subject').value.trim(); const dueDate = $('#task-date').value;
    if (!title || !subject || !dueDate) { $('#form-error').textContent = 'Add a task name, subject, and due date.'; return; }
    if (dueDate < todayISO() && !$('#task-dialog').dataset.editId) { $('#form-error').textContent = 'Choose today or a future date for a new task.'; return; }
    const task = { title, subject, dueDate, effort: Number($('#task-effort').value), priority: $('#task-priority').value };
    const editId = $('#task-dialog').dataset.editId;
    if (editId) { const old = state.tasks.find((item) => item.id === editId); Object.assign(old, task); toast('Task updated.'); }
    else { state.tasks.push({ ...task, id: crypto.randomUUID(), completed: false, createdAt: Date.now() }); toast('Task added to your plan.'); }
    save(); render(); closeDialog();
  });
  $('#task-list').addEventListener('click', (event) => {
    const row = event.target.closest('.task-row'); if (!row) return;
    const task = state.tasks.find((item) => item.id === row.dataset.id); if (!task) return;
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'focus') { state.selectedTaskId = task.id; save(); setTimerDisplay(); $('#focus').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Focus room is ready for this task.'); }
    if (action === 'complete') { task.completed = !task.completed; task.completedAt = task.completed ? Date.now() : null; save(); render(); toast(task.completed ? 'Task complete. One less thing to carry.' : 'Task moved back to your list.'); }
    if (action === 'delete') { state.tasks = state.tasks.filter((item) => item.id !== task.id); if (state.selectedTaskId === task.id) state.selectedTaskId = null; save(); render(); toast('Task removed.'); }
  });
  document.querySelectorAll('.filter-chip').forEach((chip) => chip.addEventListener('click', () => { activeFilter = chip.dataset.filter; showAll = activeFilter !== 'all'; document.querySelectorAll('.filter-chip').forEach((item) => item.classList.toggle('selected', item === chip)); renderTasks(); }));
  $('#view-all').addEventListener('click', () => { showAll = !showAll; $('#view-all').innerHTML = showAll ? 'Show less <span>↑</span>' : 'View all <span>→</span>'; renderTasks(); });
  $('#timer-button').addEventListener('click', toggleTimer);
  $('#reset-timer').addEventListener('click', () => { running = false; clearInterval(timer); timer = null; remaining = duration; setTimerDisplay(); });
  $('#duration-toggle').addEventListener('click', () => { if (running) { toast('Pause your session before changing duration.'); return; } duration = duration === 25 * 60 ? 50 * 60 : 25 * 60; remaining = duration; state.focusMinutes = duration / 60; save(); setTimerDisplay(); toast(`${duration / 60} minute sessions selected.`); });
  $('#export-button').addEventListener('click', exportData);
  render(); setTimerDisplay();
})();
