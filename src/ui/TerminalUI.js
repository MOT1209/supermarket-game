import {
  PRODUCTS, LICENSES, sellPrice, maxSpots,
  WAGE_RESTOCKER, WAGE_CASHIER
} from '../data/products.js';
import { money, rounded } from '../utils/math.js';
import {
  orderBox, buyLicense, buyFurniture, expandStore, hire, setStoreName
} from '../systems/EconomySystem.js';

export default class TerminalUI {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
    this.activeTab = 'stock';
  }

  render() {
    const g = this.game, el = this.ui.el;
    el.termCash.textContent = money(g.state.cash);
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === this.activeTab));
    let h = '';
    const tab = this.activeTab;

    if (tab === 'stock') {
      h = '<h2>Wholesale boxes (delivered outside)</h2><p class="small">Prices change daily. ↓ green = cheap, ↑ red = expensive. One box = 4–8 items.</p><div class="grid">';
      for (const pid in PRODUCTS) {
        const p = PRODUCTS[pid];
        if (p.license && !g.state.licenses.includes(p.license)) continue;
        const price = g.state.prices[pid], tr = g.state.trends[pid];
        const cls = tr > 0 ? 'up' : tr < 0 ? 'down' : '';
        const arrow = tr > 0 ? '▲' : tr < 0 ? '▼' : '—';
        h += `<div class="tile"><h3>${p.name}</h3><div>Wholesale: <span class="price">${money(price)}</span> <span class="${cls}">${arrow}</span></div>
          <div class="small">Shelves sell for ${money(sellPrice(pid))} each</div>
          <button class="btn" data-buy="${pid}" style="margin-top:8px">Order box (${money(rounded(price * 6))})</button></div>`;
      }
      h += '</div>';
    } else if (tab === 'licenses') {
      h = '<h2>Product Licenses</h2><div class="grid">';
      for (const l of LICENSES) {
        const owned = g.state.licenses.includes(l.id);
        h += `<div class="tile"><h3>📜 ${l.name}</h3><div class="small">Unlocks ${PRODUCTS[l.product].name}</div>
          ${owned ? '<div class="badge">Owned</div>' : `<button class="btn" data-lic="${l.id}" ${g.state.cash < l.cost ? 'disabled' : ''}>Buy ${money(l.cost)}</button>`}</div>`;
      }
      h += '</div>';
    } else if (tab === 'build') {
      const max = maxSpots(g.state.level), used = g.state.shelves.length;
      h = `<h2>Build & Expand</h2><p>Shelf / fridge capacity: <b>12 items</b>. Store level <b>${g.state.level}</b> — ${used}/${max} spots used.</p>
        <div class="row"><button class="btn" data-build="shelf" ${used >= max || g.state.cash < 150 ? 'disabled' : ''}>＋ Shelf ($150)</button>
        <button class="btn" data-build="fridge" ${used >= max || g.state.cash < 280 ? 'disabled' : ''}>＋ Refrigerator ($280)</button>
        <button class="btn alt" data-expand="1" ${g.state.cash < 400 * g.state.level ? 'disabled' : ''}>🏬 Expand Store (${money(400 * g.state.level)}) — +4 spots</button></div>
        <h2>Placed shelves</h2>`;
      g.state.shelves.forEach(sh => {
        h += `<div class="stat"><span>${PRODUCTS[sh.productId].name} ${sh.fridge ? '(fridge)' : ''} — spot ${sh.spot + 1}</span><span>stock ${sh.stock}</span></div>`;
      });
      if (used < max) {
        const opts = Object.keys(PRODUCTS)
          .filter(pid => !PRODUCTS[pid].license || g.state.licenses.includes(PRODUCTS[pid].license))
          .map(pid => `<option value="${pid}">${PRODUCTS[pid].name}</option>`).join('');
        h += `<label>Product for new shelf:</label><select id="newShelfProduct">${opts}</select><p class="small">Select a product, then click a buy button above.</p>`;
      }
    } else if (tab === 'staff') {
      h = '<h2>Hire Staff</h2><p class="small">Wages are deducted at the end of each day.</p><div class="grid">';
      h += `<div class="tile"><h3>📦 Restocker</h3><div class="small">Auto-moves delivery boxes to shelves.</div><div>Wage ${money(WAGE_RESTOCKER)}/day</div>
        ${g.state.staff.restocker ? '<div class="badge">Hired</div>' : `<button class="btn" data-hire="restocker" ${g.state.cash < WAGE_RESTOCKER ? 'disabled' : ''}>Hire</button>`}</div>`;
      h += `<div class="tile"><h3>💁 Cashier</h3><div class="small">Auto-scans & checks out customers.</div><div>Wage ${money(WAGE_CASHIER)}/day</div>
        ${g.state.staff.cashier ? '<div class="badge">Hired</div>' : `<button class="btn" data-hire="cashier" ${g.state.cash < WAGE_CASHIER ? 'disabled' : ''}>Hire</button>`}</div>`;
      h += '</div>';
    } else if (tab === 'custom') {
      h = `<h2>Store Customization</h2><label>Store sign name</label>
        <input type="text" id="nameInput" maxlength="14" value="${g.state.storeName.replace(/"/g, '&quot;')}">
        <button class="btn" id="renameBtn">Update Sign</button>
        <p class="small">The 3D sign above the entrance updates instantly.</p>`;
    }

    el.tabContent.innerHTML = h;
    el.tabContent.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { orderBox(g, b.dataset.buy); this.render(); });
    el.tabContent.querySelectorAll('[data-lic]').forEach(b => b.onclick = () => { buyLicense(g, b.dataset.lic); this.render(); });
    el.tabContent.querySelectorAll('[data-build]').forEach(b => b.onclick = () => { buyFurniture(g, b.dataset.build); this.render(); });
    el.tabContent.querySelectorAll('[data-expand]').forEach(b => b.onclick = () => { expandStore(g); this.render(); });
    el.tabContent.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => { hire(g, b.dataset.hire); this.render(); });
    const rename = document.getElementById('renameBtn');
    if (rename) rename.onclick = () => {
      const v = document.getElementById('nameInput').value.trim().toUpperCase() || 'FRESH MART';
      setStoreName(g, v);
      this.render();
    };
  }
}
