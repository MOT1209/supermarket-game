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

    const vol = document.getElementById('volSlider');
    vol.oninput = e => {
      const v = parseInt(e.target.value, 10) / 100;
      this.game.state.volume = v;
      this.game.audio.setVolume(v);
      document.getElementById('volVal').textContent = Math.round(v * 100) + '%';
      this.game.save();
    };

    const gfx = document.getElementById('gfxSelect');
    gfx.onchange = e => {
      this.game.state.graphics = e.target.value;
      this.game.applyGraphics();
      this.game.save();
    };
  }

  refresh() {
    const s = this.game.state;
    document.getElementById('sensSlider').value = Math.round(s.sensitivity * 100000);
    this.ui.el.sensVal.textContent = s.sensitivity.toFixed(5);
    const vol = Math.round((s.volume ?? 0.8) * 100);
    document.getElementById('volSlider').value = vol;
    document.getElementById('volVal').textContent = vol + '%';
    document.getElementById('gfxSelect').value = s.graphics || 'high';
  }
}
