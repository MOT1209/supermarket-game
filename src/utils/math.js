export const money = n => '$' + Number(n).toFixed(2);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const rounded = n => Math.round(n * 100) / 100;
