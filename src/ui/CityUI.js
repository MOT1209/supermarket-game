import { BUSINESS_LIST } from '../data/businesses.js';

export default class CityUI {
  constructor(game) {
    this.game = game;
    this.el = null;
  }

  ensureEl() {
    if (this.el) return;
    const wrap = document.createElement('div');
    wrap.id = 'cityOverlay';
    wrap.className = 'overlay';
    wrap.innerHTML = `
      <div class="card" style="width:min(520px,94vw)">
        <h1>City Directory</h1>
        <div id="cityBody"></div>
        <div class="row" style="margin-top:12px">
          <button class="btn gray" id="cityCloseBtn">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    this.el = wrap;
    wrap.querySelector('#cityCloseBtn').onclick = () => this.hide();
  }

  show() {
    this.ensureEl();
    const body = this.el.querySelector('#cityBody');
    let html = '<p class="small">Visit local businesses on Main Street.</p><div class="grid">';
    for (const b of BUSINESS_LIST) {
      html += `<div class="tile"><h3>${b.name}</h3><div class="small">${b.tagline || ''}</div>
        <button class="btn alt" data-wp="${b.id}">Set waypoint</button></div>`;
    }
    html += '</div>';
    body.innerHTML = html;
    body.querySelectorAll('[data-wp]').forEach((btn) => {
      btn.onclick = () => {
        this.game.city?.setWaypoint?.(btn.dataset.wp);
        this.game.ui.toast(`Waypoint set to ${btn.dataset.wp}`);
        this.hide();
      };
    });
    this.el.classList.add('show');
    this.game.setMode('modal');
    this.game.input?.exitLock?.();
  }

  hide() {
    if (!this.el) return;
    this.el.classList.remove('show');
    this.game.startPlaying?.();
  }
}
