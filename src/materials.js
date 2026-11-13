import * as THREE from 'three';

/**
 * Central material library. Ghost materials are intentionally depth-write free so
 * the transparent crankcase never hides the mechanical assembly inside it.
 */
export function createMaterials() {
  const ghost = new THREE.MeshPhysicalMaterial({
    color: 0x24343f,
    metalness: 0.88,
    roughness: 0.3,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 0.95,
  });

  const ghostDeep = new THREE.MeshPhysicalMaterial({
    color: 0x14202a,
    metalness: 0.92,
    roughness: 0.34,
    transparent: true,
    opacity: 0.17,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 0.8,
  });

  const coverGhost = new THREE.MeshPhysicalMaterial({
    color: 0x2e4555,
    metalness: 0.95,
    roughness: 0.2,
    clearcoat: 0.7,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.15,
  });

  const edge = new THREE.LineBasicMaterial({
    color: 0x7697ae,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });

  const edgeBright = new THREE.LineBasicMaterial({
    color: 0xa9d2e8,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
  });

  const edgeAccent = new THREE.LineBasicMaterial({
    color: 0xff7a38,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });

  const castAluminum = new THREE.MeshStandardMaterial({
    color: 0x8c9aa6,
    metalness: 0.72,
    roughness: 0.38,
    envMapIntensity: 1.1,
  });

  const castDark = new THREE.MeshStandardMaterial({
    color: 0x2a343e,
    metalness: 0.78,
    roughness: 0.33,
    envMapIntensity: 1.05,
  });

  const steel = new THREE.MeshStandardMaterial({
    color: 0xc7d2da,
    metalness: 1.0,
    roughness: 0.2,
    envMapIntensity: 1.35,
  });

  const steelDark = new THREE.MeshStandardMaterial({
    color: 0x66737f,
    metalness: 0.95,
    roughness: 0.28,
    envMapIntensity: 1.15,
  });

  const crank = new THREE.MeshStandardMaterial({
    color: 0x9daab6,
    metalness: 0.98,
    roughness: 0.26,
    envMapIntensity: 1.35,
  });

  const piston = new THREE.MeshStandardMaterial({
    color: 0xdde5eb,
    metalness: 0.94,
    roughness: 0.18,
    envMapIntensity: 1.4,
  });

  const rod = new THREE.MeshStandardMaterial({
    color: 0x91a0ac,
    metalness: 0.92,
    roughness: 0.26,
    envMapIntensity: 1.25,
  });

  const valve = new THREE.MeshStandardMaterial({
    color: 0xcfdae2,
    metalness: 0.98,
    roughness: 0.16,
    envMapIntensity: 1.4,
  });

  const spring = new THREE.MeshStandardMaterial({
    color: 0x5d6f7e,
    metalness: 0.9,
    roughness: 0.34,
    envMapIntensity: 1.1,
  });

  const rubber = new THREE.MeshStandardMaterial({
    color: 0x0c1116,
    metalness: 0.1,
    roughness: 0.9,
  });

  const copper = new THREE.MeshStandardMaterial({
    color: 0xc07a3a,
    metalness: 0.9,
    roughness: 0.28,
    envMapIntensity: 1.2,
  });

  const intakeMetal = new THREE.MeshStandardMaterial({
    color: 0x4f6474,
    metalness: 0.82,
    roughness: 0.3,
    envMapIntensity: 1.2,
  });

  const exhaustMetal = new THREE.MeshStandardMaterial({
    color: 0x64493a,
    metalness: 0.86,
    roughness: 0.4,
    emissive: 0x160500,
    emissiveIntensity: 0.5,
    envMapIntensity: 1.05,
  });

  const exhaustHot = new THREE.MeshStandardMaterial({
    color: 0x8e4b2b,
    metalness: 0.8,
    roughness: 0.38,
    emissive: 0x2a0700,
    emissiveIntensity: 0.8,
  });

  const accent = new THREE.MeshStandardMaterial({
    color: 0xff6b2c,
    emissive: 0xff3d00,
    emissiveIntensity: 1.15,
    metalness: 0.45,
    roughness: 0.3,
  });

  const accentSoft = new THREE.MeshStandardMaterial({
    color: 0xd85622,
    emissive: 0x5c1600,
    emissiveIntensity: 0.55,
    metalness: 0.55,
    roughness: 0.35,
  });

  const cyan = new THREE.MeshStandardMaterial({
    color: 0x48d6f2,
    emissive: 0x0e8ba8,
    emissiveIntensity: 1.0,
    metalness: 0.4,
    roughness: 0.3,
  });

  const sleeve = new THREE.MeshPhysicalMaterial({
    color: 0x8cb2c9,
    metalness: 0.65,
    roughness: 0.12,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.8,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x9dc7dd,
    metalness: 0.3,
    roughness: 0.08,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.5,
  });

  const flameSprite = new THREE.SpriteMaterial({
    map: null,
    color: 0xff8238,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const materials = {
    ghost,
    ghostDeep,
    coverGhost,
    edge,
    edgeBright,
    edgeAccent,
    castAluminum,
    castDark,
    steel,
    steelDark,
    crank,
    piston,
    rod,
    valve,
    spring,
    rubber,
    copper,
    intakeMetal,
    exhaustMetal,
    exhaustHot,
    accent,
    accentSoft,
    cyan,
    sleeve,
    glass,
    flameSprite,
  };

  materials.ghostBase = { ghost: ghost.opacity, ghostDeep: ghostDeep.opacity, coverGhost: coverGhost.opacity };
  materials.edgeBase = { edge: edge.opacity, edgeBright: edgeBright.opacity };
  materials.all = Object.values(materials).filter((v) => v && v.isMaterial);
  return materials;
}

export function applyModeMaterials(materials, mode, blend = 1) {
  const m = materials;
  // Store a stable base so repeated mode changes do not accumulate.
  if (!m._modeBase) {
    m._modeBase = {
      ghost: m.ghost.opacity,
      ghostDeep: m.ghostDeep.opacity,
      coverGhost: m.coverGhost.opacity,
      edge: m.edge.opacity,
      edgeBright: m.edgeBright.opacity,
      sleeve: m.sleeve.opacity,
      glass: m.glass.opacity,
    };
  }
  let g = 0.24;
  let gd = 0.17;
  let cg = 0.28;
  let e = 0.36;
  let eb = 0.58;
  let sleeve = 0.13;
  if (mode === 'xray') {
    g = 0.055;
    gd = 0.035;
    cg = 0.08;
    e = 0.22;
    eb = 0.85;
    sleeve = 0.07;
  } else if (mode === 'combustion') {
    g = 0.14;
    gd = 0.09;
    cg = 0.16;
    e = 0.28;
    eb = 0.66;
    sleeve = 0.1;
  } else if (mode === 'exploded') {
    g = 0.13;
    gd = 0.08;
    cg = 0.15;
    e = 0.38;
    eb = 0.72;
    sleeve = 0.09;
  }
  m.ghost.opacity = THREE.MathUtils.lerp(m.ghost.opacity, g, blend);
  m.ghostDeep.opacity = THREE.MathUtils.lerp(m.ghostDeep.opacity, gd, blend);
  m.coverGhost.opacity = THREE.MathUtils.lerp(m.coverGhost.opacity, cg, blend);
  m.edge.opacity = THREE.MathUtils.lerp(m.edge.opacity, e, blend);
  m.edgeBright.opacity = THREE.MathUtils.lerp(m.edgeBright.opacity, eb, blend);
  m.sleeve.opacity = THREE.MathUtils.lerp(m.sleeve.opacity, sleeve, blend);
}
