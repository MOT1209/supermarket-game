import { BUSINESSES, canUseOffer, offersUsedToday } from '../data/businesses.js';

export default class ShopUI {
  constructor(game) {
    this.game = game;
    this.el = null;
    this.currentBusinessId = null;
  }

  ensureEl() {
    if (this.el) return;
    const wrap = document.createElement('div');
    wrap.id = 'shopOverlay';
    wrap.className = 'overlay';
    wrap.innerHTML = `
      <div class="card" style="width:min(520px,94vw)">
        <h1 id="shopTitle">Shop</h1>
        <div id="shopBody"></div>
        <div class="row" style="margin-top:12px">
          <button class="btn gray" id="shopCloseBtn">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    this.el = wrap;
    wrap.querySelector('#shopCloseBtn').onclick = () => this.hide();
  }

  show(businessId) {
    this.ensureEl();
    this.currentBusinessId = businessId;
    const b = BUSINESSES[businessId];
    if (!b) return;
    this.el.querySelector('#shopTitle').textContent = b.name;
    this.render();
    this.el.classList.add('show');
    this.game.setMode('modal');
    this.game.input?.exitLock?.();
  }

  render() {
    const b = BUSINESSES[this.currentBusinessId];
    if (!b) return;
    const body = this.el.querySelector('#shopBody');
    let html = `<p class="small">${b.tagline || ''}</p><div class="grid">`;
    for (const offer of b.offers || []) {
      const used = offersUsedToday(this.game.state, b.id, offer.id);
      const limit = offer.dailyLimit || 1;
      const check = canUseOffer(this.game, b, offer);
      const disabled = !check.ok || used >= limit;
      html += `<div class="tile"><h3>${offer.label}</h3>
        <div class="small">${offer.description || ''}</div>
        <div>Cost: <span class="money">$${offer.cost || 0}</span> · ${used}/${limit} today</div>
        <button class="btn" data-offer="${offer.id}" ${disabled ? 'disabled' : ''}>${disabled ? (check.ok ? 'Used' : check.reason) : 'Buy/Use'}</button>
      </div>`;
    }
    html += `</div>`;
    body.innerHTML = html;
    body.querySelectorAll('[data-offer]').forEach((btn) => {
      btn.onclick = () => {
        const ok = this.game.businessSystem?.useOffer(this.currentBusinessId, btn.dataset.offer);
        if (ok) this.render();
      };
    });
  }

  hide() {
    if (!this.el) return;
    this.el.classList.remove('show');
    this.currentBusinessId = null;
    this.game.startPlaying?.();
  }
}
