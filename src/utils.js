import * as THREE from 'three';

export const DEG = Math.PI / 180;
export const TAU = Math.PI * 2;

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mod = (n, m) => ((n % m) + m) % m;
export const invLerp = (a, b, v) => (v - a) / (b - a);
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const damp = (current, target, lambda, dt) =>
  THREE.MathUtils.damp(current, target, lambda, dt);

export function makeGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,120,20,0)') {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.18, inner);
  g.addColorStop(0.45, outer.replace(/,\s*0\)$/, ',0.35)'));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeDotTexture(color = 'rgba(130,215,255,1)') {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, color);
  g.addColorStop(0.55, color.replace(/,\s*1\)$/, ',0.32)'));
  g.addColorStop(1, color.replace(/,\s*1\)$/, ',0)'));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeTextTexture(text, options = {}) {
  const {
    width = 512,
    height = 128,
    color = '#e8f2f7',
    accent = '#ff6b2c',
    background = 'rgba(0,0,0,0)',
    font = '700 64px Bahnschrift, "Arial Narrow", sans-serif',
    letterSpacing = '8px',
    align = 'center',
    subtext = '',
  } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  if (background !== 'rgba(0,0,0,0)') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.letterSpacing = letterSpacing;
  const x = align === 'center' ? width / 2 : 24;
  const y = subtext ? height * 0.42 : height * 0.52;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  if (subtext) {
    ctx.shadowBlur = 0;
    ctx.font = '500 20px "Segoe UI", sans-serif';
    ctx.fillStyle = accent;
    ctx.letterSpacing = '5px';
    ctx.fillText(subtext, x, height * 0.73);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeRadialTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.11)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.04)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.012)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function addEdges(parent, geometry, material, threshold = 28) {
  const edges = new THREE.EdgesGeometry(geometry, threshold);
  const line = new THREE.LineSegments(edges, material);
  line.raycast = () => {};
  parent.add(line);
  return line;
}

export function tubeFromPoints(points, radius = 0.08, segments = 24) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, segments, radius, 8, false);
  return { curve, geo };
}

export function springGeometry(radius = 0.075, height = 0.26, coils = 6, tube = 0.013) {
  const pts = [];
  const steps = coils * 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * coils * TAU;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, t * height, Math.sin(a) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, steps, tube, 5, false);
}

export function makePlateTexture(label, accent = '#ff6b2c') {
  return makeTextTexture(label, {
    width: 256,
    height: 256,
    color: '#eaf2f7',
    accent,
    font: '700 128px Bahnschrift, "Arial Narrow", sans-serif',
    letterSpacing: '0px',
  });
}

export function formatNumber(n, digits = 0) {
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function disposeTree(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

export function setShadow(object, cast = true, receive = false) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}
