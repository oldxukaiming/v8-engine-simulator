import { FIRING_ORDER } from './engine.js';
import { clamp, formatNumber } from './utils.js';

const STROKES = [
  { name: 'INTAKE', cls: 'intake', start: 0, end: 180 },
  { name: 'COMPRESSION', cls: 'compression', start: 180, end: 360 },
  { name: 'POWER', cls: 'power', start: 360, end: 540 },
  { name: 'EXHAUST', cls: 'exhaust', start: 540, end: 720 },
];

export class UI {
  constructor(callbacks) {
    this.cb = callbacks;
    this.$ = (id) => document.getElementById(id);
    this.state = null;
    this.labelElements = [];
    this.toastTimer = null;
    this.lastRpmText = '';

    this._cache();
    this._buildFiringOrder();
    this._buildGaugeTicks();
    this._bind();
    this._syncRange(this.el.throttle);
    this._syncRange(this.el.load);
  }

  _syncRange(input) {
    if (!input) return;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || 0);
    const pct = clamp((value - min) / (max - min), 0, 1) * 100;
    input.style.setProperty('--range-progress', `${pct}%`);
  }

  _cache() {
    this.el = {
      startBtn: this.$('startBtn'),
      startLabel: this.$('startLabel'),
      startIcon: this.$('startIcon'),
      statusLed: this.$('statusLed'),
      statusText: this.$('statusText'),
      throttle: this.$('throttle'),
      throttleValue: this.$('throttleValue'),
      load: this.$('load'),
      loadValue: this.$('loadValue'),
      timeButtons: [...document.querySelectorAll('[data-time]')],
      modeButtons: [...document.querySelectorAll('[data-mode]')],
      cameraButtons: [...document.querySelectorAll('[data-camera]')],
      soundBtn: this.$('btnSound'),
      labelsBtn: this.$('btnLabels'),
      helpBtn: this.$('btnHelp'),
      pauseBtn: this.$('btnPause'),
      stepBtn: this.$('btnStep'),
      shotBtn: this.$('btnScreenshot'),
      fullBtn: this.$('btnFullscreen'),
      helpModal: this.$('helpModal'),
      helpClose: this.$('helpClose'),
      firingOrder: this.$('firingOrder'),
      labelsLayer: this.$('labelsLayer'),
      rpmArc: this.$('rpmArc'),
      rpmNeedle: this.$('rpmNeedle'),
      rpmValue: this.$('rpmValue'),
      rpmSub: this.$('rpmSub'),
      hpValue: this.$('hpValue'),
      torqueValue: this.$('torqueValue'),
      tempValue: this.$('tempValue'),
      fuelValue: this.$('fuelValue'),
      strokeName: this.$('strokeName'),
      cycleDeg: this.$('cycleDeg'),
      cycleMarker: this.$('cycleMarker'),
      cycleFill: this.$('cycleFill'),
      focusCylinder: this.$('focusCylinder'),
      focusValveNote: this.$('focusValveNote'),
      intakeBar: this.$('intakeBar'),
      exhaustBar: this.$('exhaustBar'),
      intakeVal: this.$('intakeVal'),
      exhaustVal: this.$('exhaustVal'),
      ignitionState: this.$('ignitionState'),
      sparkState: this.$('sparkState'),
      loadState: this.$('loadState'),
      toast: this.$('toast'),
      flowToggle: this.$('optFlow'),
      gridToggle: this.$('optGrid'),
      autoRotate: this.$('optAutoRotate'),
      loader: this.$('loader'),
      loaderFill: this.$('loaderFill'),
      app: this.$('app'),
      panelToggle: this.$('btnPanelToggle'),
      panelClose: this.$('btnPanelClose'),
      controlPanel: this.$('controlPanel'),
    };
  }

  _buildFiringOrder() {
    this.el.firingOrder.innerHTML = '';
    FIRING_ORDER.forEach((id, index) => {
      const b = document.createElement('button');
      b.className = 'fire-chip';
      b.dataset.cyl = String(id);
      b.title = `Focus cylinder ${id}`;
      b.innerHTML = `<span class="fire-index">${String(index + 1).padStart(2, '0')}</span><b>${id}</b><i></i>`;
      b.addEventListener('click', () => this.cb.onFocus(id));
      this.el.firingOrder.appendChild(b);
    });
    this.fireChips = [...this.el.firingOrder.querySelectorAll('.fire-chip')];
  }

  _buildGaugeTicks() {
    const group = this.$('rpmTicks');
    if (!group) return;
    const cx = 100;
    const cy = 100;
    const rOuter = 90;
    const rMinor = 84;
    const rText = 68;
    let markup = '';
    for (let i = 0; i <= 8; i++) {
      const angle = (150 + i * 30) * (Math.PI / 180);
      const major = i % 2 === 0;
      const ro = major ? rOuter : 87;
      const ri = major ? rMinor : 84;
      const x1 = cx + Math.cos(angle) * ri;
      const y1 = cy + Math.sin(angle) * ri;
      const x2 = cx + Math.cos(angle) * ro;
      const y2 = cy + Math.sin(angle) * ro;
      markup += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${major ? 'tick major' : 'tick'}" />`;
      if (major) {
        const tx = cx + Math.cos(angle) * rText;
        const ty = cy + Math.sin(angle) * rText + 3;
        markup += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" class="tick-label">${i}</text>`;
      }
    }
    group.innerHTML = markup;
  }

  _bind() {
    this.el.startBtn.addEventListener('click', () => this.cb.onStart());
    this.el.throttle.addEventListener('input', (e) => {
      const v = Number(e.target.value) / 100;
      this.el.throttleValue.textContent = `${Math.round(v * 100)}%`;
      this._syncRange(e.target);
      this.cb.onThrottle(v);
    });
    this.el.load.addEventListener('input', (e) => {
      const v = Number(e.target.value) / 100;
      this.el.loadValue.textContent = `${Math.round(v * 100)}%`;
      this._syncRange(e.target);
      this.cb.onLoad(v);
    });
    this.el.timeButtons.forEach((b) =>
      b.addEventListener('click', () => {
        this.el.timeButtons.forEach((x) => x.classList.toggle('active', x === b));
        this.cb.onTimeScale(Number(b.dataset.time));
      })
    );
    this.el.modeButtons.forEach((b) =>
      b.addEventListener('click', () => {
        this.el.modeButtons.forEach((x) => x.classList.toggle('is-active', x === b));
        this.cb.onMode(b.dataset.mode);
      })
    );
    this.el.cameraButtons.forEach((b) =>
      b.addEventListener('click', () => {
        this.el.cameraButtons.forEach((x) => x.classList.toggle('is-active', x === b));
        this.cb.onCamera(b.dataset.camera);
      })
    );
    this.el.soundBtn.addEventListener('click', () => this.cb.onSound());
    this.el.labelsBtn.addEventListener('click', () => this.cb.onLabels());
    this.el.helpBtn.addEventListener('click', () => this.openHelp());
    this.el.helpClose.addEventListener('click', () => this.closeHelp());
    this.el.helpModal.addEventListener('click', (e) => {
      if (e.target === this.el.helpModal) this.closeHelp();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeHelp();
    });
    this.el.pauseBtn.addEventListener('click', () => this.cb.onPause());
    this.el.stepBtn.addEventListener('click', () => this.cb.onStep());
    this.el.shotBtn.addEventListener('click', () => this.cb.onScreenshot());
    this.el.fullBtn.addEventListener('click', () => this.cb.onFullscreen());
    this.el.flowToggle?.addEventListener('change', (e) => this.cb.onFlow(e.target.checked));
    this.el.gridToggle?.addEventListener('change', (e) => this.cb.onGrid(e.target.checked));
    this.el.autoRotate?.addEventListener('change', (e) => this.cb.onAutoRotate(e.target.checked));
    this.el.panelToggle?.addEventListener('click', () => {
      const open = this.el.controlPanel.classList.toggle('is-open');
      this.el.panelToggle.classList.toggle('is-open', open);
      this.el.panelToggle.setAttribute('aria-expanded', String(open));
      this.el.panelToggle.querySelector('span').textContent = open ? 'CLOSE' : 'CONTROLS';
    });
    this.el.panelClose?.addEventListener('click', () => {
      this.el.controlPanel.classList.remove('is-open');
      this.el.panelToggle?.classList.remove('is-open');
      this.el.panelToggle?.setAttribute('aria-expanded', 'false');
      const label = this.el.panelToggle?.querySelector('span');
      if (label) label.textContent = 'CONTROLS';
    });
  }

  initLabels(anchors) {
    this.el.labelsLayer.innerHTML = '';
    this.labelElements = anchors.map((anchor, i) => {
      const b = document.createElement('button');
      b.className = `hotspot hotspot-${anchor.side || (i % 2 === 0 ? 'left' : 'right')}`;
      b.dataset.id = anchor.id;
      b.innerHTML = `
        <span class="hotspot-dot"></span>
        <span class="hotspot-line"></span>
        <span class="hotspot-copy">
          <span class="hotspot-index">${anchor.index}</span>
          <b>${anchor.title}</b>
          <small>${anchor.sub}</small>
        </span>`;
      this.el.labelsLayer.appendChild(b);
      return { el: b, anchor };
    });
  }

  projectLabels(camera, width, height, visible) {
    if (!this.labelElements.length) return;
    this.el.labelsLayer.classList.toggle('is-hidden', !visible);
    if (!visible) return;
    for (const item of this.labelElements) {
      const world = item.anchor.position();
      const v = world.clone().project(camera);
      const behind = v.z > 1;
      const x = (v.x * 0.5 + 0.5) * width;
      const y = (-v.y * 0.5 + 0.5) * height;
      item.el.style.left = `${x.toFixed(1)}px`;
      item.el.style.top = `${y.toFixed(1)}px`;
      item.el.classList.toggle('is-behind', behind);
    }
  }

  update(state, telemetry) {
    this.state = state;
    const rpm = state.rpm;
    const progress = clamp(rpm / 8000, 0, 1);
    if (this.el.rpmArc) {
      const len = progress * 240;
      this.el.rpmArc.style.strokeDasharray = `${len.toFixed(2)} 999`;
      this.el.rpmArc.classList.toggle('redline', rpm > 6800);
    }
    if (this.el.rpmNeedle) {
      const angle = -120 + progress * 240;
      this.el.rpmNeedle.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    }
    const rpmText = String(Math.round(rpm / 10) * 10).padStart(4, '0');
    if (rpmText !== this.lastRpmText) {
      this.el.rpmValue.textContent = rpmText;
      this.lastRpmText = rpmText;
    }

    this.el.hpValue.textContent = formatNumber(telemetry.power, 0);
    this.el.torqueValue.textContent = formatNumber(telemetry.torque, 0);
    this.el.tempValue.textContent = `${Math.round(telemetry.oilTemp)}°`;
    this.el.fuelValue.textContent = telemetry.fuel.toFixed(1);
    this.el.loadState.textContent = `${Math.round(state.load * 100)}%`;

    let phase = 'STANDBY';
    let phaseClass = 'off';
    if (state.enginePhase === 'cranking') {
      phase = 'CRANKING';
      phaseClass = 'cranking';
    } else if (state.enginePhase === 'running') {
      phase = rpm < 1100 ? 'IDLE' : 'RUNNING';
      phaseClass = 'running';
    }
    this.el.statusText.textContent = phase;
    this.el.statusLed.className = `status-led ${phaseClass}`;
    this.el.ignitionState.textContent = state.enginePhase === 'running' ? 'ON' : state.enginePhase === 'cranking' ? 'CRANK' : 'OFF';
    this.el.ignitionState.className = `state-value ${state.enginePhase === 'running' ? 'good' : ''}`;

    this.el.startLabel.textContent =
      state.enginePhase === 'off' ? 'START ENGINE' : state.enginePhase === 'cranking' ? 'CANCEL START' : 'STOP ENGINE';
    this.el.startBtn.classList.toggle('is-running', state.enginePhase !== 'off');
    this.el.startBtn.classList.toggle('is-cranking', state.enginePhase === 'cranking');
    this.el.startIcon.innerHTML =
      state.enginePhase === 'off'
        ? '<path d="M8 5v14l11-7z"/>'
        : '<rect x="6" y="6" width="12" height="12" rx="1"/>';

    // Focused cylinder cycle.
    const cyl = telemetry.focus;
    const cycle = cyl ? cyl.cycle : 0;
    const pct = (cycle / 720) * 100;
    this.el.cycleMarker.style.left = `${pct.toFixed(3)}%`;
    this.el.cycleFill.style.width = `${pct.toFixed(3)}%`;
    this.el.cycleDeg.textContent = `${Math.round(cycle).toString().padStart(3, '0')}°`;
    const stroke = STROKES.find((s) => cycle >= s.start && cycle < s.end) || STROKES[0];
    this.el.strokeName.textContent = stroke.name;
    this.el.strokeName.className = `stroke-name ${stroke.cls}`;
    this.el.focusCylinder.textContent = `CYL ${String(telemetry.focusId).padStart(2, '0')}`;
    this.el.focusValveNote.textContent = `${cyl && cyl.intakeLift > 0.04 ? 'INTAKE OPEN' : cyl && cyl.exhaustLift > 0.04 ? 'EXHAUST OPEN' : 'VALVES CLOSED'}`;
    this.el.intakeBar.style.height = `${Math.max(2, (cyl?.intakeLift || 0) * 100)}%`;
    this.el.exhaustBar.style.height = `${Math.max(2, (cyl?.exhaustLift || 0) * 100)}%`;
    this.el.intakeVal.textContent = `${Math.round((cyl?.intakeLift || 0) * 100)}%`;
    this.el.exhaustVal.textContent = `${Math.round((cyl?.exhaustLift || 0) * 100)}%`;
    this.el.sparkState.textContent = telemetry.spark ? 'FIRING' : 'ARMED';
    this.el.sparkState.className = `state-value ${telemetry.spark ? 'spark' : ''}`;

    for (const chip of this.fireChips) {
      const id = Number(chip.dataset.cyl);
      chip.classList.toggle('is-active', id === state.activeCylinder);
      chip.classList.toggle('is-focus', id === telemetry.focusId);
      chip.classList.toggle('is-firing', id === state.activeCylinder && rpm > 40);
    }
  }

  setSound(enabled) {
    this.el.soundBtn.classList.toggle('is-on', enabled);
    this.el.soundBtn.setAttribute('aria-pressed', String(enabled));
    this.el.soundBtn.querySelector('.btn-label').textContent = enabled ? 'SOUND ON' : 'SOUND OFF';
    if (enabled) this.toast('PROCEDURAL V8 AUDIO ENABLED');
  }

  setLabels(enabled) {
    this.el.labelsBtn.classList.toggle('is-on', enabled);
    this.el.labelsBtn.setAttribute('aria-pressed', String(enabled));
    this.el.labelsLayer.classList.toggle('is-user-hidden', !enabled);
  }

  setPaused(paused) {
    this.el.pauseBtn.classList.toggle('is-on', paused);
    this.el.pauseBtn.querySelector('.btn-label').textContent = paused ? 'RESUME' : 'PAUSE';
    if (this.el.app) this.el.app.classList.toggle('is-paused', paused);
  }

  setFlow(enabled) {
    if (this.el.flowToggle) this.el.flowToggle.checked = enabled;
  }

  setAutoRotate(enabled) {
    if (this.el.autoRotate) this.el.autoRotate.checked = enabled;
  }

  setLoader(progress) {
    if (this.el.loaderFill) this.el.loaderFill.style.width = `${clamp(progress, 0, 100)}%`;
  }

  hideLoader() {
    if (!this.el.loader) return;
    this.el.loader.classList.add('is-done');
    document.body.classList.add('is-ready');
    setTimeout(() => {
      if (this.el.loader.parentNode) this.el.loader.parentNode.removeChild(this.el.loader);
    }, 900);
  }

  openHelp() {
    this.el.helpModal.classList.add('is-open');
    document.body.classList.add('modal-open');
  }

  closeHelp() {
    this.el.helpModal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
  }

  toast(message, duration = 2400) {
    if (!this.el.toast) return;
    this.el.toast.textContent = message;
    this.el.toast.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.el.toast.classList.remove('is-visible'), duration);
  }

  fatal(message) {
    if (!this.el.loader) return;
    this.el.loader.innerHTML = `<div class="loader-content"><div class="loader-kicker">SYSTEM FAULT</div><h2>WEBGL UNAVAILABLE</h2><p>${message}</p></div>`;
  }
}
