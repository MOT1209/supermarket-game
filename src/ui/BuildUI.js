import { BUILD_CATALOG, isShelfType, shelfProductOptions } from '../data/build.js';
import { PRODUCTS } from '../data/products.js';

const keyHint = (touch, key) => (touch ? '' : ` (${key})`);

export default class BuildUI {
  constructor(game) {
    this.game = game;
    this.el = null;
    this.panel = null;
    this.touch = false;
  }

  ensureEl() {
    if (this.el) return;
    this.touch = !!this.game.input?.touch?.enabled;
    const hint = (key) => keyHint(this.touch, key);
    const wrap = document.createElement('div');
    wrap.id = 'buildBar';
    wrap.classList.toggle('touch', this.touch);
    wrap.innerHTML = `
      <div class="panel build-panel">
        <span class="build-title">Build</span>
        <select id="buildTypeSelect" aria-label="Build item"></select>
        <select id="buildProductSelect" aria-label="Shelf product"></select>
        <button class="btn" id="buildPlaceBtn" type="button">Place${hint('E')}</button>
        <button class="btn alt" id="buildDoneBtn" type="button">Done${hint('Esc')}</button>
        <button class="btn alt" id="buildRotateBtn" type="button">Rotate${hint('R')}</button>
        <button class="btn alt" id="buildMoveBtn" type="button">Move${hint('G')}</button>
        <button class="btn red" id="buildRemoveBtn" type="button">Remove${hint('F')}</button>
        <button class="btn red" id="buildCancelBtn" type="button">Cancel${hint('X')}</button>
      </div>
    `;
    document.body.appendChild(wrap);
    this.el = wrap;
    this.panel = wrap.querySelector('.build-panel');

    const sel = wrap.querySelector('#buildTypeSelect');
    for (const key of Object.keys(BUILD_CATALOG)) {
      const it = BUILD_CATALOG[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${it.name} ($${it.cost || 0})`;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => this.game.buildSystem?.setCatalog(sel.value));
    const productSel = wrap.querySelector('#buildProductSelect');
    productSel.addEventListener('change', () => {
      this.game.buildSystem?.setProduct(productSel.value);
    });
    wrap.querySelector('#buildRotateBtn').onclick = () => this.game.buildSystem?.rotate();
    wrap.querySelector('#buildPlaceBtn').onclick = () => this.game.buildSystem?.confirmPlace();
    wrap.querySelector('#buildDoneBtn').onclick = () => this.game.buildSystem?.stop();
    wrap.querySelector('#buildMoveBtn').onclick = () => this.game.buildSystem?.startMove();
    wrap.querySelector('#buildRemoveBtn').onclick = () => this.game.buildSystem?.removeAtLook();
    wrap.querySelector('#buildCancelBtn').onclick = () => this.game.buildSystem?.cancel();
    wrap.style.display = 'none';
  }

  // Mirror the build system's current piece in the bar. A shelf being moved
  // keeps its product, so the picker is hidden for that move. The place button
  // changes wording for a move, and Cancel only exists when there is one.
  syncSelection() {
    if (!this.el) return;
    const build = this.game.buildSystem;
    const type = this.el.querySelector('#buildTypeSelect');
    if (type && build) type.value = build.catalogType;
    const moving = !!build?.moveTarget;
    const product = this.el.querySelector('#buildProductSelect');
    const showProduct = !moving && isShelfType(build?.catalogType);
    if (product) product.style.display = showProduct ? '' : 'none';
    if (this.touch) {
      type?.classList.toggle('wide', !showProduct);
      this.panel?.classList.toggle('moving', moving);
    }
    const place = this.el.querySelector('#buildPlaceBtn');
    if (place) {
      place.textContent = `Place${moving ? ' move' : ''}${keyHint(this.touch, 'E')}`;
    }
    const cancel = this.el.querySelector('#buildCancelBtn');
    if (cancel) {
      cancel.style.display = moving ? '' : 'none';
      cancel.textContent = `Cancel${keyHint(this.touch, 'X')}`;
    }
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
    this.syncSelection();
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
