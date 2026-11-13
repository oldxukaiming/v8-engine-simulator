/**
 * Procedural V8 soundtrack. The firing frequency of a four-stroke V8 is
 * rpm / 15 Hz (four power pulses per crank revolution). Harmonic saw layers,
 * filtered noise and a soft clipper produce the low-frequency exhaust character
 * without loading any audio assets.
 */
export class EngineAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.running = false;
    this.rpm = 0;
    this.throttle = 0;
    this.lastUpdate = 0;
    this.started = false;
  }

  _makeNoiseBuffer(ctx) {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.94 + white * 0.06;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  _makeDriveCurve(amount = 1.4) {
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    return curve;
  }

  ensureContext() {
    if (this.ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    const ctx = new AudioCtx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    this.master.connect(limiter).connect(ctx.destination);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 650;
    this.filter.Q.value = 0.65;

    this.drive = ctx.createWaveShaper();
    this.drive.curve = this._makeDriveCurve(1.8);
    this.drive.oversample = '2x';

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineGain.connect(this.filter);
    this.filter.connect(this.drive);
    this.drive.connect(this.master);

    this.oscillators = [];
    const layers = [
      { type: 'sawtooth', ratio: 0.5, gain: 0.45, detune: -4 },
      { type: 'sawtooth', ratio: 1, gain: 0.62, detune: 3 },
      { type: 'square', ratio: 2, gain: 0.16, detune: 0 },
      { type: 'sawtooth', ratio: 3, gain: 0.13, detune: 7 },
      { type: 'triangle', ratio: 4, gain: 0.08, detune: -7 },
    ];
    for (const layer of layers) {
      const osc = ctx.createOscillator();
      osc.type = layer.type;
      osc.frequency.value = 50 * layer.ratio;
      osc.detune.value = layer.detune;
      const gain = ctx.createGain();
      gain.gain.value = layer.gain;
      osc.connect(gain).connect(this.engineGain);
      osc.start();
      this.oscillators.push({ osc, gain, ratio: layer.ratio, baseGain: layer.gain });
    }

    const noise = ctx.createBufferSource();
    noise.buffer = this._makeNoiseBuffer(ctx);
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 480;
    noiseFilter.Q.value = 0.9;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.12;
    noise.connect(noiseFilter).connect(noiseGain).connect(this.engineGain);
    noise.start();
    this.noise = noise;
    this.noiseFilter = noiseFilter;
    this.noiseGain = noiseGain;

    this.starterGain = ctx.createGain();
    this.starterGain.gain.value = 0;
    this.starterGain.connect(this.master);
    this.starterOsc = ctx.createOscillator();
    this.starterOsc.type = 'sawtooth';
    this.starterOsc.frequency.value = 58;
    const starterFilter = ctx.createBiquadFilter();
    starterFilter.type = 'lowpass';
    starterFilter.frequency.value = 220;
    this.starterOsc.connect(starterFilter).connect(this.starterGain);
    this.starterOsc.start();

    return true;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) {
      if (!this.ensureContext() || !this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.master.gain.setTargetAtTime(0.34, this.ctx.currentTime, 0.08);
    } else if (this.ctx) {
      this.master.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
    }
  }

  setRunning(running) {
    this.running = running;
    if (!this.ctx) return;
    this.engineGain.gain.setTargetAtTime(running ? 0.2 : 0.0, this.ctx.currentTime, 0.18);
  }

  crankStarter(duration = 0.9) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.starterGain.gain.cancelScheduledValues(now);
    this.starterGain.gain.setValueAtTime(0, now);
    this.starterGain.gain.linearRampToValueAtTime(0.12, now + 0.06);
    this.starterGain.gain.setValueAtTime(0.12, now + duration * 0.7);
    this.starterGain.gain.linearRampToValueAtTime(0, now + duration);
    this.starterOsc.frequency.setValueAtTime(52, now);
    this.starterOsc.frequency.linearRampToValueAtTime(82, now + duration * 0.6);
    this.starterOsc.frequency.linearRampToValueAtTime(64, now + duration);
  }

  catchEngine() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(1600, now);
    this.filter.frequency.exponentialRampToValueAtTime(700, now + 0.4);
    this.engineGain.gain.cancelScheduledValues(now);
    this.engineGain.gain.setValueAtTime(0.32, now);
    this.engineGain.gain.setTargetAtTime(0.2, now + 0.08, 0.16);
  }

  update(rpm, throttle, running) {
    if (!this.ctx || !this.enabled) return;
    this.rpm = rpm;
    this.throttle = throttle;
    this.running = running;
    const now = this.ctx.currentTime;
    if (now - this.lastUpdate < 0.035) return;
    this.lastUpdate = now;

    const firing = Math.max(18, rpm / 15);
    for (const layer of this.oscillators) {
      layer.osc.frequency.setTargetAtTime(firing * layer.ratio, now, 0.045);
      const load = running ? 1 : 0.2;
      layer.gain.gain.setTargetAtTime(layer.baseGain * load, now, 0.1);
    }
    this.filter.frequency.setTargetAtTime(
      240 + throttle * 2650 + Math.min(rpm, 7000) * 0.16,
      now,
      0.07
    );
    this.filter.Q.setTargetAtTime(0.6 + throttle * 0.9, now, 0.1);
    this.engineGain.gain.setTargetAtTime(running ? 0.16 + throttle * 0.12 : 0.0, now, 0.12);
    this.noiseFilter.frequency.setTargetAtTime(380 + rpm * 0.22, now, 0.1);
    this.noiseGain.gain.setTargetAtTime((0.03 + throttle * 0.055) * (running ? 1 : 0.2), now, 0.12);
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    if (this.ctx && this.enabled && this.ctx.state === 'suspended') this.ctx.resume();
  }
}
