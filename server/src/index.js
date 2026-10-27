import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { Cart, Order, Product, User } from './models.js';
import { canTransitionOrder, calculateOrderTotals, ORDER_STATUSES } from './domain.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'local-cartwise-development-key-change-me';
const seed = [
  ['Forma Ceramic Carafe','Home',2480,'A softly sculpted stoneware carafe, made for slow mornings and long tables.','https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=85','BESTSELLER'],
  ['Everyday Market Tote','Accessories',1490,'A sturdy, room-for-everything canvas carryall in heavyweight organic cotton.','https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85','NEW'],
  ['Rituals Tea Set','Kitchen',3650,'Two hand-finished cups and a matching infuser for your daily pause.','https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=85','LIMITED'],
  ['Sunday Linen Throw','Home',4200,'Relaxed, breathable linen with a lived-in softness from the very first day.','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85',''],
  ['Soft Form Desk Lamp','Lighting',2890,'A warm pool of light, precisely where you need it. Compact, weighted, dimmable.','https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85',''],
  ['Daily Ritual Journal','Stationery',890,'A calm place for ideas and lists. 160 uncoated pages with a lay-flat binding.','https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85','SALE'],
  ['Pebble Glass Set','Kitchen',1750,'A set of two weighty, hand-blown glasses with a subtle pebble base.','https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85',''],
  ['Sunday Market Basket','Accessories',2150,'Woven from responsibly sourced natural fibres, for market days and home.','https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85','POPULAR']
];

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (res, status, message) => res.status(status).json({ error: { message } });
const requireDb = (req, res, next) => mongoose.connection.readyState === 1 ? next() : fail(res, 503, 'Store database is not connected. Configure MONGODB_URI.');
const tokenFor = user => jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
const auth = asyncRoute(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  if (!token) return fail(res, 401, 'Sign in to continue.');
  try { const claims = jwt.verify(token, jwtSecret); req.user = await User.findById(claims.sub).select('_id name email role'); if (!req.user) return fail(res, 401, 'Account no longer exists.'); next(); }
  catch { return fail(res, 401, 'Your session has expired. Sign in again.'); }
});
const admin = (req, res, next) => req.user?.role === 'admin' ? next() : fail(res, 403, 'Administrator access is required.');
const safeUser = user => ({ id: user.id, name: user.name, email: user.email, role: user.role });
const slugify = value => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

app.get('/api/v1/health', (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api/v1', requireDb);

app.post('/api/v1/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || String(password || '').length < 8) return fail(res, 400, 'Enter your name, a valid email, and a password of at least 8 characters.');
  if (await User.exists({ email: email.toLowerCase() })) return fail(res, 409, 'An account with that email already exists.');
  const user = await User.create({ name: name.trim(), email, passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json({ user: safeUser(user), token: tokenFor(user) });
}));
app.post('/api/v1/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !await bcrypt.compare(String(password || ''), user.passwordHash)) return fail(res, 401, 'Email or password is incorrect.');
  res.json({ user: safeUser(user), token: tokenFor(user) });
}));
app.get('/api/v1/auth/me', auth, (req, res) => res.json({ user: safeUser(req.user) }));

app.get('/api/v1/products', asyncRoute(async (req, res) => {
  const { q, category, sort = 'featured', page = 1, limit = 24 } = req.query;
  const filter = { isActive: true };
  if (category && category !== 'All products') filter.category = String(category).slice(0, 50);
  if (q) filter.name = { $regex: String(q).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const order = sort === 'price-low' ? { price: 1 } : sort === 'price-high' ? { price: -1 } : sort === 'rating' ? { rating: -1 } : { createdAt: -1 };
  const take = Math.min(Math.max(Number(limit) || 24, 1), 48); const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
  const [items, count] = await Promise.all([Product.find(filter).sort(order).skip(skip).limit(take).lean(), Product.countDocuments(filter)]);
  res.json({ items: items.map(p => ({ ...p, id: p._id.toString() })), page: Number(page) || 1, pages: Math.ceil(count / take), count });
}));
app.get('/api/v1/products/:id', asyncRoute(async (req, res) => {
  const p = await Product.findOne({ $or: [{ slug: req.params.id }, ...(mongoose.isValidObjectId(req.params.id) ? [{ _id: req.params.id }] : [])], isActive: true }).lean();
  if (!p) return fail(res, 404, 'We could not find that product.');
  res.json({ product: { ...p, id: p._id.toString() } });
}));
app.post('/api/v1/products', auth, admin, asyncRoute(async (req, res) => {
  const { name, category, price, image, description = '', stock = 20 } = req.body || {};
  if (!name?.trim() || !category?.trim() || !Number.isFinite(Number(price)) || Number(price) < 1 || !Number.isInteger(Number(stock)) || Number(stock) < 0) return fail(res, 400, 'Product name, category, valid price, and nonnegative stock are required.');
  let slug = slugify(name); if (await Product.exists({ slug })) slug += `-${Date.now().toString(36)}`;
  const product = await Product.create({ name: name.trim(), slug, category: category.trim(), price: Number(price), image, description, stock: Number(stock), badge: 'NEW' });
  res.status(201).json({ product });
}));
app.patch('/api/v1/products/:id', auth, admin, asyncRoute(async (req, res) => {
  const allowed = ['name', 'description', 'category', 'image', 'price', 'stock', 'isActive'];
  const changes = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  if (changes.price !== undefined && (!Number.isFinite(Number(changes.price)) || Number(changes.price) < 1)) return fail(res, 400, 'Price must be a positive number.');
  if (changes.stock !== undefined && (!Number.isInteger(Number(changes.stock)) || Number(changes.stock) < 0)) return fail(res, 400, 'Stock must be a nonnegative whole number.');
  const product = await Product.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
  if (!product) return fail(res, 404, 'Product not found.'); res.json({ product });
}));
app.delete('/api/v1/products/:id', auth, admin, asyncRoute(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) return fail(res, 404, 'Product not found.'); res.json({ ok: true });
}));

const cartPayload = async userId => {
  const cart = await Cart.findOne({ user: userId }).populate('items.product', 'name image price stock isActive').lean();
  const items = (cart?.items || []).filter(i => i.product?.isActive).map(i => ({ product: { ...i.product, id: i.product._id.toString() }, quantity: i.quantity }));
  return { items, subtotal: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0) };
};
app.get('/api/v1/cart', auth, asyncRoute(async (req, res) => res.json(await cartPayload(req.user.id))));
app.post('/api/v1/cart/items', auth, asyncRoute(async (req, res) => {
  const { productId, quantity = 1 } = req.body || {};
  if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return fail(res, 400, 'Choose a valid product and quantity.');
  const product = await Product.findOne({ _id: productId, isActive: true }); if (!product) return fail(res, 404, 'That product is no longer available.');
  const cart = await Cart.findOneAndUpdate({ user: req.user.id, 'items.product': productId }, { $inc: { 'items.$.quantity': quantity } }, { new: true });
  if (!cart) await Cart.findOneAndUpdate({ user: req.user.id }, { $push: { items: { product: productId, quantity } } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json(await cartPayload(req.user.id));
}));
app.patch('/api/v1/cart/items/:productId', auth, asyncRoute(async (req, res) => {
  const quantity = Number(req.body?.quantity);
  if (!mongoose.isValidObjectId(req.params.productId) || !Number.isInteger(quantity) || quantity < 0 || quantity > 99) return fail(res, 400, 'Quantity must be between 0 and 99.');
  if (quantity === 0) await Cart.updateOne({ user: req.user.id }, { $pull: { items: { product: req.params.productId } } });
  else await Cart.updateOne({ user: req.user.id, 'items.product': req.params.productId }, { $set: { 'items.$.quantity': quantity } });
  res.json(await cartPayload(req.user.id));
}));
app.delete('/api/v1/cart/items/:productId', auth, asyncRoute(async (req, res) => { await Cart.updateOne({ user: req.user.id }, { $pull: { items: { product: req.params.productId } } }); res.json(await cartPayload(req.user.id)); }));

app.post('/api/v1/orders', auth, asyncRoute(async (req, res) => {
  const { items, shippingAddress, paymentMethod = 'Cash on Delivery', discountCode = '' } = req.body || {};
  if (!Array.isArray(items) || !items.length || items.length > 40) return fail(res, 400, 'Your cart is empty or contains too many products.');
  if (!shippingAddress?.name?.trim() || !shippingAddress?.line1?.trim() || !shippingAddress?.city?.trim() || !/^\d{6}$/.test(shippingAddress?.postalCode || '')) return fail(res, 400, 'Enter a complete delivery address with a six-digit PIN code.');
  if (!['Cash on Delivery', 'Sandbox payment'].includes(paymentMethod)) return fail(res, 400, 'Choose a supported payment method.');
  const normalized = new Map();
  for (const item of items) { if (!mongoose.isValidObjectId(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return fail(res, 400, 'The cart contains an invalid item.'); normalized.set(item.productId, (normalized.get(item.productId) || 0) + item.quantity); }
  const reserved = []; let created;
  try {
    const snapshots = []; let subtotal = 0;
    for (const [id, quantity] of normalized) {
      const p = await Product.findOneAndUpdate({ _id: id, isActive: true, stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { new: true });
      if (!p) throw Object.assign(new Error('A product is out of stock or no longer available. Please review your cart.'), { status: 409 });
      reserved.push({ id: p._id, quantity });
      snapshots.push({ product: p._id, name: p.name, image: p.image, unitPrice: p.price, quantity }); subtotal += p.price * quantity;
    }
    const totals = calculateOrderTotals(subtotal, discountCode);
    created = await Order.create({ number: `CW-${Date.now().toString().slice(-7)}`, user: req.user.id, items: snapshots, shippingAddress, ...totals, paymentMethod });
  } catch (err) {
    if (reserved.length) await Product.bulkWrite(reserved.map(item => ({ updateOne: { filter: { _id: item.id }, update: { $inc: { stock: item.quantity } } } })));
    throw err;
  }
  await Cart.updateOne({ user: req.user.id }, { $set: { items: [] } });
  res.status(201).json({ order: created });
}));
app.get('/api/v1/orders/mine', auth, asyncRoute(async (req, res) => res.json({ orders: await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).lean() })));
app.get('/api/v1/orders/:id', auth, asyncRoute(async (req, res) => {
  const order = await Order.findOne({ $or: [{ number: req.params.id }, ...(mongoose.isValidObjectId(req.params.id) ? [{ _id: req.params.id }] : [])], user: req.user.id }).lean();
  if (!order) return fail(res, 404, 'Order not found.'); res.json({ order });
}));
app.get('/api/v1/admin/orders', auth, admin, asyncRoute(async (req, res) => res.json({ orders: await Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(100).lean() })));
app.patch('/api/v1/admin/orders/:id/status', auth, admin, asyncRoute(async (req, res) => {
  if (!ORDER_STATUSES.includes(req.body?.status)) return fail(res, 400, 'Choose a valid order status.');
  const existing = await Order.findById(req.params.id);
  if (!existing) return fail(res, 404, 'Order not found.');
  if (!canTransitionOrder(existing.status, req.body.status)) return fail(res, 409, `An order cannot move from ${existing.status} to ${req.body.status}.`);
  existing.status = req.body.status;
  const order = await existing.save();
  res.json({ order });
}));
app.get('/api/v1/admin/summary', auth, admin, asyncRoute(async (req, res) => {
  const [sales, orders, products, lowStock] = await Promise.all([Order.aggregate([{ $match: { status: { $ne: 'Cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }]), Order.countDocuments(), Product.countDocuments({ isActive: true }), Product.countDocuments({ isActive: true, stock: { $lte: 5 } })]);
  res.json({ sales: sales[0]?.total || 0, orders, products, lowStock });
}));

app.use((req, res) => fail(res, 404, 'That store endpoint does not exist.'));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || (err.name === 'ValidationError' ? 400 : err.code === 11000 ? 409 : 500);
  if (status >= 500) console.error(err.message);
  res.status(status).json({ error: { message: status >= 500 ? 'Something went wrong. Please try again.' : err.message } });
});

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      if (await Product.countDocuments() === 0) await Product.insertMany(seed.map(([name, category, price, description, image, badge]) => ({ name, category, price, description, image, badge, slug: slugify(name), stock: 20 })));
      if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && !await User.exists({ email: process.env.ADMIN_EMAIL.toLowerCase() })) {
        await User.create({ name: process.env.ADMIN_NAME || 'Cartwise Admin', email: process.env.ADMIN_EMAIL, role: 'admin', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12) });
      }
      console.log('Connected to MongoDB.');
    } catch (err) { console.error(`MongoDB connection failed: ${err.message}`); }
  } else console.log('MONGODB_URI is not set. API is running in demo mode; configure MongoDB for persistent API data.');
  app.listen(port, () => console.log(`Cartwise API listening on http://localhost:${port}`));
}
start();
