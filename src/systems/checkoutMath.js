import { rounded } from '../utils/math.js';

// Bills a customer can hand over, smallest first. Keep this the single source
// of truth so the displayed bill and the accepted change can never drift.
const BILLS = [10, 20, 50, 100];
const TOLERANCE = 0.005;

export function pickBill(total) {
  return BILLS.find((b) => b >= total) || 100;
}

export function changeDue(total) {
  return rounded(pickBill(total) - total);
}

export function isExactChange(given, total) {
  return Math.abs(given - changeDue(total)) < TOLERANCE;
}

export function isExactCardAmount(value, total) {
  const amount = parseFloat(value);
  return !Number.isNaN(amount) && Math.abs(amount - total) < TOLERANCE;
}
