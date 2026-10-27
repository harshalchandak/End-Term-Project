import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionOrder, calculateOrderTotals } from './domain.js';

test('checkout charges delivery below the free shipping threshold', () => {
  assert.deepEqual(calculateOrderTotals(1490), { subtotal: 1490, shipping: 120, discount: 0, total: 1610 });
});

test('checkout waives delivery at ₹2,500 and above', () => {
  assert.deepEqual(calculateOrderTotals(2500), { subtotal: 2500, shipping: 0, discount: 0, total: 2500 });
});

test('valid HELLO200 code is applied once in server totals', () => {
  assert.deepEqual(calculateOrderTotals(1490, 'HELLO200'), { subtotal: 1490, shipping: 120, discount: 200, total: 1410 });
  assert.equal(calculateOrderTotals(1490, 'hello200').discount, 0);
});

test('checkout totals reject invalid subtotals', () => {
  assert.throws(() => calculateOrderTotals(-1), RangeError);
  assert.throws(() => calculateOrderTotals(Number.NaN), RangeError);
});

test('fulfillment only moves forward through allowed order states', () => {
  assert.equal(canTransitionOrder('Placed', 'Processing'), true);
  assert.equal(canTransitionOrder('Processing', 'Shipped'), true);
  assert.equal(canTransitionOrder('Shipped', 'Delivered'), true);
  assert.equal(canTransitionOrder('Placed', 'Delivered'), false);
  assert.equal(canTransitionOrder('Delivered', 'Processing'), false);
  assert.equal(canTransitionOrder('Cancelled', 'Processing'), false);
});
