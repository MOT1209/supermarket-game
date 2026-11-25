import { money } from '../utils/math.js';
import TerminalUI from './TerminalUI.js';
import SummaryUI from './SummaryUI.js';
import PauseUI from './PauseUI.js';

const IDs = [
  'loading', 'hud', 'prompt', 'cashText', 'timeText', 'clockBox', 'carry', 'msg',
  'repText',
  'startOverlay', 'pauseOverlay', 'terminalOverlay', 'checkoutOverlay', 'summaryOverlay',
  'tabContent', 'sensVal', 'termCash', 'checkoutBody', 'summaryBody', 'sumDay'
];

export default class UIManager {
  constructor(game) {
    this.game = game;
    this.el = {};
    for (const id of IDs) this.el[id] = document.getElementById(id);
    this.terminal = new TerminalUI(game, this);
    this.summary = new SummaryUI(game, this);
    this.pause = new PauseUI(game, this);
    this.bindStatic();
  }

  bindStatic() {
    const g = this.game, el = this.el;
    document.getElementById('startBtn').onclick = () => {
      g.audio.init();
      this.hideAll();
      g.mode = 'playing';
      this.updateHUD();
      g.input.requestLock();
    };
    document.getElementById('newGameBtn').onclick = () => {
      if (confirm('Start a completely new game? Your current save will be erased.')) g.newGame();
    };
    document.getElementById('resumeBtn').onclick = () => {
      this.hideAll(); g.mode = 'playing'; g.input.requestLock();
    };
    document.getElementById('saveBtn').onclick = () => g.save(true);
    document.getElementById('resetBtn').onclick = () => {
      if (confirm('Reset all saved progress?')) g.newGame();
    };
    document.getElementById('closeBtn').onclick = () => { if (g.mode === 'playing') g.closeStore(); };
    document.getElementById('termClose').onclick = () => this.closeTerminal();
    document.getElementById('nextDayBtn').onclick = () => this.summary.nextDay();
    document.querySelectorAll('.tab').forEach(t => {
      t.onclick = () => { this.terminal.activeTab = t.dataset.tab; this.terminal.render(); };
    });
  }

  show(name) {
    const key = name + 'Overlay';
    if (this.el[key]) this.el[key].classList.add('show');
  }

  hide(name) {
    const key = name + 'Overlay';
    if (this.el[key]) this.el[key].classList.remove('show');
  }

  hideAll() {
    for (const key of ['start', 'pause', 'terminal', 'checkout', 'summary']) this.hide(key);
  }

  showPauseSettings() { this.show('pause'); this.pause.refresh(); }

  setPrompt(text) {
    const p = this.el.prompt;
    if (!text) { p.style.opacity = 0; return; }
    if (p.textContent !== text) p.textContent = text;
    p.style.opacity = 1;
  }

  updateHUD() {
    this.el.cashText.textContent = money(this.game.state.cash);
    if (this.el.repText) {
      const rep = this.game.state.reputation ?? 3;
      this.el.repText.textContent = rep.toFixed(1);
    }
  }

  updateClock(text, day) {
    this.el.timeText.textContent = text;
    if (this.el.clockBox.firstChild) this.el.clockBox.firstChild.textContent = `Day ${day}  |  `;
  }

  updateCarry(text) {
    const c = this.el.carry;
    if (!text) { c.style.opacity = 0; return; }
    c.textContent = text;
    c.style.opacity = 1;
  }

  toast(msg) {
    this.el.msg.textContent = msg;
    this.el.msg.style.opacity = 1;
    this.game.toastTimer = 2.4;
  }

  openTerminal() {
    this.game.mode = 'modal';
    this.game.input.exitLock();
    this.terminal.activeTab = 'stock';
    this.show('terminal');
    this.terminal.render();
  }

  closeTerminal() {
    this.hide('terminal');
    this.game.mode = 'playing';
    this.game.input.requestLock();
  }

  showCheckout(html) {
    this.el.checkoutBody.innerHTML = html;
    this.show('checkout');
  }
}
