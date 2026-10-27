export const ORDER_STATUSES = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const transitions = {
  Placed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: []
};

export function canTransitionOrder(from, to) {
  return transitions[from]?.includes(to) ?? false;
}

export function calculateOrderTotals(subtotal, discountCode = '') {
  if (!Number.isFinite(subtotal) || subtotal < 0) throw new RangeError('Subtotal must be a nonnegative number.');
  const shipping = subtotal >= 2500 || subtotal === 0 ? 0 : 120;
  const discount = discountCode === 'HELLO200' ? 200 : 0;
  return { subtotal, shipping, discount, total: Math.max(0, subtotal + shipping - discount) };
}
