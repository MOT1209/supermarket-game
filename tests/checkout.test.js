import test from 'node:test';
import assert from 'node:assert/strict';
import { rounded } from '../src/utils/math.js';
import {
  pickBill,
  changeDue,
  isExactChange,
  isExactCardAmount
} from '../src/systems/checkoutMath.js';

test('pickBill chooses the smallest bill that covers the total', () => {
  assert.equal(pickBill(0), 10);
  assert.equal(pickBill(9.18), 10);
  assert.equal(pickBill(20), 20);
  assert.equal(pickBill(20.01), 50);
  assert.equal(pickBill(150), 100);
});

test('changeDue rounds away floating point noise', () => {
  assert.equal(changeDue(9.18), 0.82);
  assert.equal(changeDue(20), 0);
  assert.equal(changeDue(3.06), 6.94);
  assert.equal(changeDue(0.1 + 0.2), 9.7);
});

test('isExactChange accepts the displayed change, including rounded coin sums', () => {
  assert.equal(isExactChange(0.82, 9.18), true);
  let given = 0;
  for (const coin of [0.5, 0.25, 0.05, 0.01, 0.01]) given = rounded(given + coin);
  assert.equal(given, 0.82);
  assert.equal(isExactChange(given, 9.18), true);
  assert.equal(isExactChange(0.81, 9.18), false);
  assert.equal(isExactChange(0.825, 9.18), false);
});

test('isExactCardAmount validates numeric input within one cent', () => {
  assert.equal(isExactCardAmount('9.18', 9.18), true);
  assert.equal(isExactCardAmount('9.184', 9.18), true);
  assert.equal(isExactCardAmount('9.19', 9.18), false);
  assert.equal(isExactCardAmount('', 9.18), false);
  assert.equal(isExactCardAmount('abc', 9.18), false);
  assert.equal(isExactCardAmount(9.18, 9.18), true);
});
