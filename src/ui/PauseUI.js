export default class PauseUI {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
    const slider = document.getElementById('sensSlider');
    slider.oninput = e => {
      this.game.state.sensitivity = parseInt(e.target.value, 10) / 100000;
      this.ui.el.sensVal.textContent = this.game.state.sensitivity.toFixed(5);
      this.game.save();
    };
  }

  refresh() {
    document.getElementById('sensSlider').value = Math.round(this.game.state.sensitivity * 100000);
    this.ui.el.sensVal.textContent = this.game.state.sensitivity.toFixed(5);
  }
}
