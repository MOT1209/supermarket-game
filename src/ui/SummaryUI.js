import { money } from '../utils/math.js';

export default class SummaryUI {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
  }

  render(data) {
    const el = this.ui.el;
    el.sumDay.textContent = '— Day ' + data.day;
    el.summaryBody.innerHTML = `
      <div class="stat"><span>🛒 Total Revenue</span><b class="money">${money(data.revenue)}</b></div>
      <div class="stat"><span>📦 Stock Costs</span><b class="money">${money(data.stockCost)}</b></div>
      <div class="stat"><span>👥 Staff Wages</span><b class="money">${money(data.wages)}</b></div>
      <div class="stat"><span>♻ Recycling Bonus</span><b class="money">${money(data.recycle)}</b></div>
      <div class="stat" style="border-color:#6fe089"><span>💰 Net Profit</span><b style="color:${data.net >= 0 ? '#8ff0a4' : '#ff7b6b'}">${money(data.net)}</b></div>
      <div class="stat"><span>😊 Happy Customers</span><b>${data.happy}</b></div>
      <div class="stat"><span>😠 Angry Customers</span><b>${data.angry}</b></div>
      <div class="stat"><span>💵 Cash on hand</span><b class="money">${money(data.cash)}</b></div>`;
    this.ui.show('summary');
  }

  nextDay() {
    this.game.nextDay();
  }
}
