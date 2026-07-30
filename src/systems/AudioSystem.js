// Web Audio API — procedural sound generation (no external assets needed)
class AudioSystem {
  constructor() {
    this._ctx = null;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  _play(freq, type, duration, gain = 0.15, detune = 0) {
    try {
      const ctx = this._getCtx();
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.connect(env);
      env.connect(ctx.destination);
      osc.type    = type;
      osc.frequency.value = freq;
      osc.detune.value    = detune;
      env.gain.setValueAtTime(gain, ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) { /* audio not available */ }
  }

  _noise(duration, gain = 0.1) {
    try {
      const ctx  = this._getCtx();
      const buf  = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src  = ctx.createBufferSource();
      src.buffer = buf;
      const env  = ctx.createGain();
      src.connect(env);
      env.connect(ctx.destination);
      env.gain.setValueAtTime(gain, ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      src.start();
    } catch (e) { /* */ }
  }

  playAttack() {
    this._noise(0.08, 0.12);
    this._play(150, 'sawtooth', 0.12, 0.08, -200);
  }

  playMagic() {
    this._play(880, 'sine', 0.4, 0.1);
    this._play(1100, 'sine', 0.3, 0.08, 700);
  }

  playDoor() {
    this._noise(0.4, 0.06);
    this._play(80, 'sawtooth', 0.5, 0.12);
  }

  playDamage() {
    this._noise(0.15, 0.18);
    this._play(200, 'square', 0.2, 0.1);
  }
}
