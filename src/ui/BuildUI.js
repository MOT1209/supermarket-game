import { BUILD_CATALOG, isShelfType, shelfProductOptions } from '../data/build.js';
import { PRODUCTS } from '../data/products.js';

export default class BuildUI {
  constructor(game) {
    this.game = game;
    this.el = null;
  }

  ensureEl() {
    if (this.el) return;
    const wrap = document.createElement('div');
    wrap.id = 'buildBar';
    wrap.style.cssText =
      'position:fixed;left:50%;transform:translateX(-50%);bottom:120px;z-index:15;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;pointer-events:auto;';
    wrap.innerHTML = `
      <div class="panel" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <span style="color:#8ff0a4;font-weight:700;">Build</span>
        <select id="buildTypeSelect"></select>
        <select id="buildProductSelect" title="Product"></select>
        <button class="btn alt" id="buildRotateBtn" type="button">Rotate (R)</button>
        <button class="btn" id="buildPlaceBtn" type="button">Place (E)</button>
        <button class="btn red" id="buildCancelBtn" type="button">Cancel (X)</button>
      </div>
    `;
    document.body.appendChild(wrap);
    this.el = wrap;

    const sel = wrap.querySelector('#buildTypeSelect');
    for (const key of Object.keys(BUILD_CATALOG)) {
      const it = BUILD_CATALOG[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${it.name} ($${it.cost || 0})`;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => {
      this.game.buildSystem?.setCatalog(sel.value);
      this.updateProductVisibility();
    });
    const productSel = wrap.querySelector('#buildProductSelect');
    productSel.addEventListener('change', () => {
      this.game.buildSystem?.setProduct(productSel.value);
    });
    wrap.querySelector('#buildRotateBtn').onclick = () => this.game.buildSystem?.rotate();
    wrap.querySelector('#buildPlaceBtn').onclick = () => this.game.buildSystem?.confirmPlace();
    wrap.querySelector('#buildCancelBtn').onclick = () => this.game.buildSystem?.cancel();
    wrap.style.display = 'none';
  }

  updateProductVisibility() {
    const sel = this.el?.querySelector('#buildProductSelect');
    if (!sel) return;
    sel.style.display = isShelfType(this.game.buildSystem?.catalogType) ? '' : 'none';
  }

  refreshProducts() {
    const sel = this.el?.querySelector('#buildProductSelect');
    if (!sel) return;
    const wanted = this.game.buildSystem?.productId;
    sel.innerHTML = '';
    for (const pid of shelfProductOptions(this.game)) {
      const opt = document.createElement('option');
      opt.value = pid;
      opt.textContent = PRODUCTS[pid].name;
      sel.appendChild(opt);
    }
    if (wanted && [...sel.options].some((o) => o.value === wanted)) {
      sel.value = wanted;
    } else if (sel.options.length) {
      this.game.buildSystem?.setProduct(sel.options[0].value);
    }
    this.updateProductVisibility();
  }

  show() {
    this.ensureEl();
    this.refreshProducts();
    this.el.style.display = 'flex';
  }

  hide() {
    if (this.el) this.el.style.display = 'none';
  }
}
