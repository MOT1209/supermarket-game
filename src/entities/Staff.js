import { refreshShelfVisual } from '../world/ShelfFactory.js';
import { removeBox, rebuildBoxLabel } from '../systems/DeliverySystem.js';

let restockTimer = 0;

export function resetStaffTimers() { restockTimer = 0; }

export function updateStaff(game, dt) {
  if (!game.state.staff.restocker) return;
  restockTimer += dt;
  if (restockTimer < 3) return;
  restockTimer = 0;
  for (const b of game.runtime.boxes.slice()) {
    if (b.trash || b === game.runtime.carried || b.qty <= 0) continue;
    const sh = game.runtime.shelves.find(s => s.productId === b.productId && s.stock < s.capacity);
    if (!sh) continue;
    const add = Math.min(b.qty, sh.capacity - sh.stock);
    sh.stock += add;
    b.qty -= add;
    refreshShelfVisual(sh.spot, sh.group, sh, game);
    game.syncShelfData();
    game.audio.play('place');
    if (b.qty <= 0) removeBox(game, b);
    else rebuildBoxLabel(game, b);
  }
}
