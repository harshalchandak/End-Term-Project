# StudySprint

StudySprint is a personal workload planner for students who want a clear next step when assignments and exams start to pile up. It turns due dates, importance, and estimated effort into a ranked task list, then gives students a simple focus timer and a weekly progress target.

## Problem and users

Students often keep deadlines in one place, study time in another, and progress in their heads. StudySprint gives an individual student one small workspace to see what needs attention, choose a task, work in a timed session, and see that effort accumulate.

## What you can do

- Add tasks with a subject, due date, estimated effort, and importance.
- See an automatically ranked list. Overdue and near deadlines rise to the top; importance and shorter tasks affect the ranking too.
- Filter tasks by due date or completion, mark work complete, or remove tasks.
- Select a task to carry it into the focus room, then run or pause a 25 or 50 minute focus session.
- Track completed focus minutes against a 300 minute weekly goal.
- Keep tasks, completed sessions, timer preference, and the selected task in browser storage; export a JSON backup at any time.

The first launch includes three example tasks to make the workspace easy to explore. They can be completed or deleted like any other task.

## Main workflows

1. **Plan:** add assignments and deadlines; the priority score places urgent work first.
2. **Choose:** filter the list and select a task to set the focus room context.
3. **Focus:** complete a timed session; successful sessions add minutes to the weekly progress total.
4. **Review:** check completed work and export a backup of the saved workspace.

## Technology and architecture

- HTML for the accessible page structure and task form.
- CSS for the responsive interface and visual states.
- Vanilla JavaScript for task validation, urgency scoring, sorting, task state, timer lifecycle, progress aggregation, and JSON export.
- `localStorage` for per-browser persistence. There is no server, account system, or external API.

The app is a static client-side application. `app.js` owns the state and renders the task list and weekly statistics; `styles.css` adapts the dashboard for desktop and mobile layouts. User-entered text is escaped before it is rendered in the task list.

## Run locally

No package install or build step is needed. From this directory, start a local static server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. You can also open `index.html` directly in a modern browser. The web font is loaded from Google Fonts when internet access is available; the application itself does not depend on a network API.

## Data and privacy

Workspace data stays in the current browser profile under the `studysprint.v1` local storage key. Clearing browser storage removes it. Use the export button in the top bar to download a JSON backup. No secrets or credentials are required. This local-only version does not sync data between devices.

## Deployment

The folder can be served by any static hosting provider. Publish `index.html`, `styles.css`, and `app.js` together at the site root. For example, create a new GitHub repository, push this folder, and enable GitHub Pages for the branch and root directory. A deployed URL and demo video can be added here after publishing.

## Project files

```text
index.html   Application structure and task dialog
styles.css   Responsive dashboard styling
app.js       Prioritization, persistence, timer, and interactions
README.md    Product and setup documentation
```
