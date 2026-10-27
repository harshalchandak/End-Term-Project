import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 90 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['shopper', 'admin'], default: 'shopper' }
}, { timestamps: true });

const productSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '', maxlength: 2000 },
  category: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  price: { type: Number, required: true, min: 1 }, // INR minor units can be used if currency expands
  stock: { type: Number, default: 20, min: 0 },
  rating: { type: Number, default: 5 },
  reviews: { type: Number, default: 0 },
  badge: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const cartSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{ product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, quantity: { type: Number, min: 1, max: 99, required: true } }]
}, { timestamps: true });

const orderSchema = new Schema({
  number: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{ product: { type: Schema.Types.ObjectId, ref: 'Product' }, name: String, image: String, unitPrice: Number, quantity: Number }],
  shippingAddress: { name: String, line1: String, city: String, postalCode: String },
  subtotal: { type: Number, required: true },
  shipping: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash on Delivery', 'Sandbox payment'], default: 'Cash on Delivery' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Refunded'], default: 'Pending' },
  status: { type: String, enum: ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Placed' }
}, { timestamps: true });

export const User = model('User', userSchema);
export const Product = model('Product', productSchema);
export const Cart = model('Cart', cartSchema);
export const Order = model('Order', orderSchema);
