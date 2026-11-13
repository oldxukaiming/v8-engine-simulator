import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EngineModel, FIRING_ORDER, REDLINE, IDLE_RPM } from './engine.js';
import { EngineAudio } from './audio.js';
import { UI } from './ui.js';
import { i18n } from './i18n.js';
import { clamp, damp, mod, makeRadialTexture, easeInOutCubic } from './utils.js';

const canvas = document.getElementById('stage');
const params = new URLSearchParams(window.location.search);
const lowPowerDevice =
  window.matchMedia('(max-width: 760px)').matches ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const pixelRatioCap = () => Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.35 : 1.85);

const state = {
  enginePhase: 'off',
  rpm: 0,
  throttle: 0.08,
  load: 0.18,
  timeScale: 0.35,
  crankAngle: 0,
  mode: 'cutaway',
  showFlow: true,
  showGrid: true,
  labels: true,
  sound: false,
  paused: false,
  autoRotate: true,
  focusId: 1,
  activeCylinder: 1,
  starterTimer: 0,
  revCut: 0,
  revCutPulse: 0,
  oilTemp: 24,
  runtime: 0,
  fps: 60,
};

const cameras = {
  iso: { pos: new THREE.Vector3(8.55, 5.1, 9.25), target: new THREE.Vector3(0, 0.7, 0) },
  front: { pos: new THREE.Vector3(-13.6, 3.25, 0.25), target: new THREE.Vector3(0, 0.7, 0) },
  side: { pos: new THREE.Vector3(0.3, 3.45, 12.8), target: new THREE.Vector3(0, 0.65, 0) },
  top: { pos: new THREE.Vector3(0.01, 15.1, 0.01), target: new THREE.Vector3(0, 0.35, 0) },
};

let renderer;
let scene;
let camera;
let controls;
let engine;
let audio;
let ui;
let gridGroup;
let floor;
let dust;
let clock;
let cameraTween = null;
let lastUIUpdate = 0;
let frameCount = 0;
let fpsAccum = 0;
let booted = false;

function torqueCurve(rpm) {
  const points = [
    [0, 300],
    [700, 385],
    [1500, 475],
    [2500, 555],
    [3500, 605],
    [4400, 620],
    [5200, 602],
    [6200, 560],
    [7000, 505],
    [7600, 450],
  ];
  for (let i = 0; i < points.length - 1; i++) {
    const [r0, t0] = points[i];
    const [r1, t1] = points[i + 1];
    if (rpm <= r1) {
      const t = clamp((rpm - r0) / (r1 - r0), 0, 1);
      return t0 + (t1 - t0) * t;
    }
  }
  return points[points.length - 1][1];
}

function initThree() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(pixelRatioCap());
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05090d, 0.023);

  camera = new THREE.PerspectiveCamera(cameraFovForViewport(), window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(13.5, 7.6, 15);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(cameras.iso.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.6;
  controls.minDistance = 5.2;
  controls.maxDistance = 25;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.34;
  controls.enablePan = true;
  controls.update();

  controls.addEventListener('start', () => {
    if (state.autoRotate) {
      state.autoRotate = false;
      controls.autoRotate = false;
      ui?.setAutoRotate(false);
    }
  });

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envTexture = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = envTexture;
  pmrem.dispose();
  envScene.dispose?.();

  const hemi = new THREE.HemisphereLight(0x9cc8e4, 0x05070a, 0.6);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff1dd, 2.7);
  key.position.set(7, 10, 7.5);
  key.castShadow = true;
  key.shadow.mapSize.set(lowPowerDevice ? 1024 : 2048, lowPowerDevice ? 1024 : 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 26;
  key.shadow.camera.left = -8.5;
  key.shadow.camera.right = 8.5;
  key.shadow.camera.top = 8.5;
  key.shadow.camera.bottom = -8.5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x5fc8ff, 1.7);
  rim.position.set(-7, 4, -8);
  scene.add(rim);

  const warm = new THREE.PointLight(0xff5b1e, 12, 10, 2);
  warm.position.set(-5.5, 1.6, 2.8);
  scene.add(warm);

  const cool = new THREE.PointLight(0x3fd7ff, 12, 12, 2);
  cool.position.set(5.5, 2.4, -3.5);
  scene.add(cool);

  buildEnvironment();
  engine = new EngineModel(scene);
  clock = new THREE.Clock();
}

function buildEnvironment() {
  gridGroup = new THREE.Group();
  scene.add(gridGroup);

  const floorGeo = new THREE.CircleGeometry(17, 96);
  floor = new THREE.Mesh(
    floorGeo,
    new THREE.MeshStandardMaterial({
      color: 0x080d12,
      metalness: 0.55,
      roughness: 0.68,
      envMapIntensity: 0.4,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.63;
  floor.receiveShadow = true;
  gridGroup.add(floor);

  const grid = new THREE.GridHelper(34, 68, 0x21485c, 0x10222d);
  grid.position.y = -1.615;
  grid.material.transparent = true;
  grid.material.opacity = 0.42;
  grid.material.depthWrite = false;
  gridGroup.add(grid);

  const glowTex = makeRadialTexture(512);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 13),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.75,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -1.6;
  gridGroup.add(glow);

  for (const [r, color, op] of [
    [5.2, 0xff6428, 0.26],
    [5.45, 0x5fe4ff, 0.16],
    [8.0, 0x4d9fc4, 0.09],
  ]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r, r + 0.012, 128),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: op,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.59;
    gridGroup.add(ring);
  }

  // Floating dust.
  const count = 280;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = 4 + Math.random() * 11;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = -1 + Math.random() * 8;
    positions[i * 3 + 2] = Math.sin(a) * r;
    c.setHSL(0.53 + Math.random() * 0.07, 0.6, 0.45 + Math.random() * 0.35);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  dust = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  dust.frustumCulled = false;
  scene.add(dust);
}

function framedPreset(name) {
  const preset = cameras[name] || cameras.iso;
  const target = preset.target.clone();
  const aspect = window.innerWidth / window.innerHeight;
  const scale = aspect < 1 ? clamp(0.88 / aspect, 1, 1.8) : 1;
  const pos = target.clone().add(preset.pos.clone().sub(preset.target).multiplyScalar(scale));
  return { pos, target };
}

function cameraFovForViewport() {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect < 0.62) return 44;
  if (aspect < 0.9) return 40;
  return 36;
}

function sphericalFrom(position, target) {
  const offset = position.clone().sub(target);
  const radius = Math.max(0.001, offset.length());
  return {
    radius,
    theta: Math.atan2(offset.z, offset.x),
    phi: Math.acos(clamp(offset.y / radius, -1, 1)),
  };
}

function focusCamera(name, duration = 1.15) {
  const preset = framedPreset(name);
  const from = camera.position.clone();
  const fromTarget = controls.target.clone();
  const fromSph = sphericalFrom(from, fromTarget);
  const toSph = sphericalFrom(preset.pos, preset.target);
  let dTheta = toSph.theta - fromSph.theta;
  while (dTheta > Math.PI) dTheta -= Math.PI * 2;
  while (dTheta < -Math.PI) dTheta += Math.PI * 2;
  cameraTween = {
    fromSph,
    toSph,
    thetaDelta: dTheta,
    fromTarget,
    toTarget: preset.target.clone(),
    t: 0,
    duration,
  };
  controls.autoRotate = false;
  state.autoRotate = false;
  ui?.setAutoRotate(false);
}

function snapCamera(name) {
  const preset = framedPreset(name);
  cameraTween = null;
  camera.position.copy(preset.pos);
  controls.target.copy(preset.target);
  controls.update();
  controls.autoRotate = false;
  state.autoRotate = false;
  ui?.setAutoRotate(false);
}

function startEngine(auto = false) {
  if (state.enginePhase !== 'off') {
    stopEngine();
    return;
  }
  if (state.paused) {
    state.paused = false;
    ui.setPaused(false);
    audio.resume();
  }
  state.enginePhase = 'cranking';
  state.starterTimer = auto ? 0.72 : 0.95;
  state.rpm = 210;
  audio.setRunning(true);
  audio.crankStarter(state.starterTimer);
  ui.toast(i18n.t('toast.starter'), 1700);
}

function stopEngine() {
  const wasRunning = state.enginePhase === 'running';
  state.enginePhase = 'off';
  state.revCut = 0;
  audio.setRunning(false);
  if (wasRunning) ui.toast(i18n.t('toast.stop'));
}

function catchEngine() {
  state.enginePhase = 'running';
  state.rpm = 1120;
  state.revCutPulse = 1;
  audio.catchEngine();
  ui.toast(i18n.t('toast.caught'));
}

function updateSimulation(dt) {
  state.runtime += dt;
  if (!state.paused) {
    if (state.enginePhase === 'cranking') {
      state.starterTimer -= dt;
      state.rpm = damp(state.rpm, 295, 7, dt);
      if (state.starterTimer <= 0) catchEngine();
    } else if (state.enginePhase === 'running') {
      const loadFactor = 1 - state.load * 0.34;
      const throttleDeadband = clamp((state.throttle - 0.04) / 0.96, 0, 1);
      const throttleCurve = Math.pow(throttleDeadband, 1.45);
      let target = IDLE_RPM + throttleCurve * (REDLINE - IDLE_RPM) * loadFactor;
      target = Math.min(target, 7440);

      if (state.revCut > 0) {
        state.revCut -= dt;
        target = IDLE_RPM * 0.82;
        if (state.revCut <= 0) state.revCutPulse = 1;
      } else if (state.rpm > 7335) {
        state.revCut = 0.11;
        state.revCutPulse = 0;
        ui.toast(i18n.t('toast.limiter'), 900);
      }

      const response = 2.1 + state.throttle * 4.1;
      state.rpm = damp(state.rpm, target, response, dt);
      if (state.rpm < 500 && state.throttle < 0.02) {
        // Idle governor prevents a stall under light load.
        state.rpm = damp(state.rpm, IDLE_RPM, 1.2, dt);
      }
    } else {
      state.rpm = damp(state.rpm, 0, 1.05, dt);
      if (state.rpm < 3) state.rpm = 0;
    }

    state.crankAngle = mod(state.crankAngle + state.rpm * 6 * state.timeScale * dt, 720);

    const tempTarget =
      state.enginePhase === 'running' ? 88 + state.load * 13 + state.throttle * 7 : 24;
    state.oilTemp = damp(state.oilTemp, tempTarget, 0.025, dt);
  }

  state.activeCylinder = engine.activeCylinder;

  const throttleLoad = clamp(0.03 + state.throttle * 0.97, 0, 1);
  const torque = state.enginePhase === 'running' && state.revCut <= 0 ? torqueCurve(state.rpm) * throttleLoad : 0;
  const power = (torque * state.rpm) / 7127;
  const fuel =
    state.enginePhase === 'running'
      ? 0.5 + (state.rpm / REDLINE) * 4 + (state.throttle * state.rpm) / REDLINE * 36
      : 0;
  const focus = engine.getFocusCylinder(state.focusId);
  const spark =
    state.enginePhase === 'running' &&
    engine.cylinders.some((c) => c.cycle > 351 && c.cycle < 369);

  return { torque, power, fuel, focus, focusId: state.focusId, spark, oilTemp: state.oilTemp };
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = cameraFovForViewport();
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatioCap());
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function takeScreenshot() {
  if (!renderer) return;
  renderer.render(scene, camera);
  const source = renderer.domElement;
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 0, out.height);
  bg.addColorStop(0, '#060b10');
  bg.addColorStop(0.55, '#09121a');
  bg.addColorStop(1, '#030608');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  const pad = Math.round(out.width * 0.018);
  ctx.font = `600 ${Math.round(out.width * 0.012)}px Bahnschrift, "Microsoft YaHei", "Arial Narrow", sans-serif`;
  ctx.fillStyle = 'rgba(185,220,235,0.68)';
  ctx.textAlign = 'left';
  ctx.fillText(i18n.t('export.watermark'), pad, out.height - pad);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,110,45,0.9)';
  ctx.fillText(
    `${Math.round(state.rpm)} RPM  ·  ${i18n.t(`modeLabel.${state.mode}`)}`,
    out.width - pad,
    out.height - pad
  );
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `v8-engine-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    ui.toast(i18n.t('toast.screenshot'));
  }, 'image/png');
}

function bindUI() {
  ui = new UI({
    onStart: () => startEngine(false),
    onThrottle: (v) => {
      state.throttle = v;
      if (state.enginePhase === 'off' && v > 0.5) ui.toast(i18n.t('toast.pressStart'), 1400);
    },
    onLoad: (v) => {
      state.load = v;
    },
    onTimeScale: (v) => {
      state.timeScale = v;
      ui.toast(i18n.t('toast.timeWarp', { value: v.toFixed(2) }), 1200);
    },
    onMode: (mode) => {
      state.mode = mode;
      engine.setMode(mode);
      ui.toast(i18n.t('toast.mode', { mode: i18n.t(`modeLabel.${mode}`) }));
    },
    onSound: () => {
      state.sound = !state.sound;
      audio.setEnabled(state.sound);
      audio.setRunning(state.enginePhase === 'running' || state.enginePhase === 'cranking');
      if (state.sound && state.enginePhase === 'cranking') audio.crankStarter(0.5);
      ui.setSound(state.sound);
    },
    onLabels: () => {
      state.labels = !state.labels;
      ui.setLabels(state.labels);
    },
    onPause: () => {
      state.paused = !state.paused;
      ui.setPaused(state.paused);
      if (state.paused) audio.suspend();
      else audio.resume();
    },
    onStep: () => {
      if (!state.paused) {
        state.paused = true;
        ui.setPaused(true);
        audio.suspend();
      }
      state.crankAngle = mod(state.crankAngle + 90, 720);
      engine.update(0.016, state);
      ui.toast(i18n.t('toast.step'), 900);
    },
    onScreenshot: takeScreenshot,
    onFullscreen: () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => ui.toast(i18n.t('toast.fullscreen')));
      } else {
        document.exitFullscreen?.();
      }
    },
    onCamera: (name) => focusCamera(name),
    onFlow: (v) => {
      state.showFlow = v;
    },
    onGrid: (v) => {
      state.showGrid = v;
      if (gridGroup) gridGroup.visible = v;
    },
    onAutoRotate: (v) => {
      state.autoRotate = v;
      controls.autoRotate = v;
    },
    onFocus: (id) => {
      state.focusId = id;
      ui.toast(i18n.t('toast.focus', { n: String(id).padStart(2, '0') }), 1000);
    },
    onLanguage: (lang) => {
      if (!i18n.setLanguage(lang)) return;
      ui.applyLanguage(lang);
      ui.toast(i18n.t(lang === 'zh' ? 'toast.langZh' : 'toast.langEn'));
    },
  });
  ui.initLabels(engine.labelAnchors);
  ui.setLabels(state.labels);
  ui.setSound(state.sound);
  ui.setPaused(state.paused);
  ui.setAutoRotate(state.autoRotate);
  ui.applyLanguage(i18n.lang);
}

function animate() {
  requestAnimationFrame(animate);
  if (!renderer) return;
  const rawDt = clock ? clock.getDelta() : 0.016;
  const dt = Math.min(rawDt, 0.05);
  fpsAccum += rawDt;
  frameCount++;
  if (fpsAccum > 0.5) {
    state.fps = frameCount / fpsAccum;
    frameCount = 0;
    fpsAccum = 0;
  }

  const telemetry = updateSimulation(dt);
  engine.update(state.paused ? 0.016 : dt, state);
  audio.update(state.rpm, state.throttle, state.enginePhase === 'running');

  if (cameraTween) {
    cameraTween.t += dt;
    const raw = clamp(cameraTween.t / cameraTween.duration, 0, 1);
    const t = easeInOutCubic(raw);
    const target = new THREE.Vector3().lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, t);
    const radius = THREE.MathUtils.lerp(cameraTween.fromSph.radius, cameraTween.toSph.radius, t);
    const theta = cameraTween.fromSph.theta + cameraTween.thetaDelta * t;
    const phi = THREE.MathUtils.lerp(cameraTween.fromSph.phi, cameraTween.toSph.phi, t);
    const sinPhi = Math.sin(phi);
    camera.position.set(
      target.x + radius * sinPhi * Math.cos(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * sinPhi * Math.sin(theta)
    );
    controls.target.copy(target);
    if (raw >= 1) cameraTween = null;
  }

  if (dust) {
    dust.rotation.y += dt * 0.012;
    dust.material.opacity = 0.38 + 0.14 * Math.sin(state.runtime * 0.35);
  }
  if (state.autoRotate && !cameraTween) controls.autoRotate = true;
  controls.update();
  renderer.render(scene, camera);

  const now = performance.now();
  if (now - lastUIUpdate > 28) {
    lastUIUpdate = now;
    ui.update(state, telemetry);
    ui.projectLabels(camera, window.innerWidth, window.innerHeight, state.labels);
  }
}

function bindKeyboard() {
  window.addEventListener('keydown', (event) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = event.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;
    const key = event.key.toLowerCase();
    const helpOpen = document.getElementById('helpModal')?.classList.contains('is-open');
    if (helpOpen) {
      if (key === 'escape' || key === 'h' || key === '?') {
        event.preventDefault();
        ui.closeHelp();
      }
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      state.enginePhase === 'off' ? startEngine(false) : stopEngine();
    } else if (key === 'p') {
      event.preventDefault();
      document.getElementById('btnPause').click();
    } else if (key === 'l') {
      event.preventDefault();
      document.getElementById('btnLabels').click();
    } else if (key === 'm') {
      event.preventDefault();
      document.getElementById('btnSound').click();
    } else if (key === 'r') {
      event.preventDefault();
      focusCamera('iso');
    } else if (key === 'h' || key === '?') {
      event.preventDefault();
      ui.openHelp();
    } else if (['1', '2', '3', '4'].includes(key)) {
      event.preventDefault();
      const modes = ['cutaway', 'xray', 'exploded', 'combustion'];
      document.querySelector(`[data-mode="${modes[Number(key) - 1]}"]`)?.click();
    } else if (key === 'arrowright' && state.paused) {
      event.preventDefault();
      document.getElementById('btnStep').click();
    }
  });
}

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = i18n.t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = i18n.t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = i18n.t(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', i18n.t(el.dataset.i18nAria));
  });
  document.title = i18n.t('meta.title');
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', i18n.t('meta.description'));
}

function boot() {
  applyStaticI18n();
  try {
    initThree();
    bindUI();
    bindKeyboard();
    ui.setLoader(100);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) audio?.suspend();
      else if (state.sound && !state.paused) audio?.resume();
    });

    animate();

    if (params.has('debug')) {
      window.__V8 = {
        state,
        startEngine,
        stopEngine,
        get engine() { return engine; },
        get ui() { return ui; },
        get audio() { return audio; },
        get camera() { return camera; },
        get controls() { return controls; },
        get renderer() { return renderer; },
        focusCamera,
        snapCamera,
      };
    }

    setTimeout(() => {
      ui.hideLoader();
      const initialView = params.get('view');
      const validView = ['iso', 'front', 'side', 'top'].includes(initialView) ? initialView : 'iso';
      if (params.get('snap') === '1') snapCamera(validView);
      else focusCamera(validView, 2.4);
      const initialMode = params.get('mode');
      if (['cutaway', 'xray', 'exploded', 'combustion'].includes(initialMode)) {
        const button = document.querySelector(`[data-mode="${initialMode}"]`);
        button?.click();
      }
      if (params.get('autostart') !== '0') {
        setTimeout(() => {
          if (state.enginePhase === 'off') startEngine(true);
        }, 600);
      }
    }, 650);

    booted = true;
  } catch (error) {
    console.error(error);
    if (ui) ui.fatal(error.message || 'Unable to initialize WebGL.');
    else {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.innerHTML = `<div class="loader-content"><div class="loader-kicker">SYSTEM FAULT</div><h2>WEBGL UNAVAILABLE</h2><p>${error.message || 'Unable to initialize WebGL.'}</p></div>`;
      }
    }
  }
}

audio = new EngineAudio();
boot();
