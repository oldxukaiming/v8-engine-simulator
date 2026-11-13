import * as THREE from 'three';
import { createMaterials, applyModeMaterials } from './materials.js';
import { optimizeStaticGeometry } from './optimize.js';
import {
  DEG,
  TAU,
  clamp,
  mod,
  damp,
  addEdges,
  makeGlowTexture,
  makeDotTexture,
  makeTextTexture,
  makePlateTexture,
  springGeometry,
  tubeFromPoints,
} from './utils.js';

export const FIRING_ORDER = [1, 8, 7, 2, 6, 5, 4, 3];
export const REDLINE = 7200;
export const IDLE_RPM = 850;

const PIN_X = [-2.55, -0.85, 0.85, 2.55];
const PIN_BASE = [45, 135, 315, 225];
const CRANK_RADIUS = 0.47;
const ROD_LENGTH = 1.62;
const BORE = 0.43;

// Front pair 1/2, then 3/4, 5/6, 7/8. The 90-degree pin clocking and 270-degree
// bank phasing produce the classic cross-plane 1-8-7-2-6-5-4-3 firing order.
const CYLINDER_META = [
  { id: 1, bankIndex: 0, pin: 0, fireIndex: 0 },
  { id: 2, bankIndex: 1, pin: 0, fireIndex: 3 },
  { id: 3, bankIndex: 0, pin: 1, fireIndex: 7 },
  { id: 4, bankIndex: 1, pin: 1, fireIndex: 6 },
  { id: 5, bankIndex: 0, pin: 2, fireIndex: 5 },
  { id: 6, bankIndex: 1, pin: 2, fireIndex: 4 },
  { id: 7, bankIndex: 0, pin: 3, fireIndex: 2 },
  { id: 8, bankIndex: 1, pin: 3, fireIndex: 1 },
];

const BANK_DEFS = [
  { id: 'R', label: 'RIGHT', angle: 45, cylinders: [1, 3, 5, 7], inner: -1, outer: 1 },
  { id: 'L', label: 'LEFT', angle: -45, cylinders: [2, 4, 6, 8], inner: 1, outer: -1 },
];

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function makeCamLobeGeometry() {
  const shape = new THREE.Shape();
  const count = 64;
  for (let i = 0; i <= count; i++) {
    const a = (i / count) * TAU;
    const bump = Math.pow(Math.max(0, Math.sin(a)), 6);
    const r = 0.145 + 0.105 * bump;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.125,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.translate(0, 0, -0.0625);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function makeCrankWebGeometry(radialAngle) {
  const shape = new THREE.Shape();
  const r = CRANK_RADIUS;
  shape.moveTo(-0.58, -0.46);
  shape.quadraticCurveTo(-0.76, 0, -0.58, 0.46);
  shape.lineTo(-0.05, 0.54);
  shape.quadraticCurveTo(r + 0.16, 0.4, r + 0.36, 0.13);
  shape.quadraticCurveTo(r + 0.44, 0, r + 0.36, -0.13);
  shape.quadraticCurveTo(r + 0.16, -0.4, -0.05, -0.54);
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(-0.31, 0, 0.13, 0, TAU, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.translate(0, 0, -0.07);

  const a = radialAngle * DEG;
  const radial = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
  const tangent = new THREE.Vector3(0, -Math.sin(a), Math.cos(a));
  const extrusion = new THREE.Vector3(1, 0, 0);
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(radial, tangent, extrusion));
  return geo;
}

function makeGearTeeth(count, radius, width, toothWidth, toothDepth, material) {
  const geo = new THREE.BoxGeometry(width, toothDepth, toothWidth);
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    e.set(a, 0, 0);
    q.setFromEuler(e);
    m.compose(
      new THREE.Vector3(0, Math.cos(a) * radius, Math.sin(a) * radius),
      q,
      new THREE.Vector3(1, 1, 1)
    );
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function makeGearDisc(radius, thickness, material, teeth = 0, x = 0) {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, thickness, 40),
    material
  );
  disc.rotation.z = Math.PI / 2;
  disc.position.x = x;
  group.add(disc);
  if (teeth > 0) {
    const toothMesh = makeGearTeeth(
      teeth,
      radius + 0.035,
      thickness * 0.85,
      0.055,
      0.11,
      material
    );
    toothMesh.position.x = x;
    group.add(toothMesh);
  }
  return group;
}

export class EngineModel {
  constructor(scene) {
    this.scene = scene;
    this.materials = createMaterials();
    this.root = new THREE.Group();
    this.root.name = 'V8_ENGINE';
    scene.add(this.root);

    this.cylinders = [];
    this.cylindersById = new Map();
    this.banks = [];
    this.camshafts = [];
    this.explodables = [];
    this.flowCurves = [];
    this.flowParticles = null;
    this.crankAngle = 0;
    this.explode = 0;
    this.mode = 'cutaway';
    this.elapsed = 0;
    this.activeCylinder = 1;
    this.maxFlame = 0;

    this.flameTexture = makeGlowTexture('rgba(255,250,230,1)', 'rgba(255,78,8,0)');
    this.sparkTexture = makeDotTexture('rgba(150,235,255,1)');
    this.flowTexture = makeDotTexture('rgba(160,230,255,1)');

    this._buildCrankcase();
    this._buildCrank();
    this._buildBanks();
    this._buildIntake();
    this._buildTimingDrive();
    this._buildEffects();
    this._buildFlowParticles();
    this._setupLabels();
    this._applyMode('cutaway', 1);
    this.optimization = optimizeStaticGeometry(this.root);

    this.root.traverse((obj) => {
      if (obj.isMesh && !obj.material.transparent) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }

  worldFromBank(bank, x, y, z) {
    const a = bank.angle * DEG;
    return new THREE.Vector3(x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a));
  }

  _mesh(parent, geo, mat, pos, rot, name) {
    const mesh = new THREE.Mesh(geo, mat);
    if (pos) mesh.position.copy(pos);
    if (rot) mesh.rotation.set(rot.x ?? 0, rot.y ?? 0, rot.z ?? 0);
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
  }

  _addBox(parent, sx, sy, sz, mat, x, y, z, edgeMaterial = null) {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    if (edgeMaterial) addEdges(mesh, geo, edgeMaterial);
    return mesh;
  }

  _addCylinder(parent, rt, rb, h, mat, x, y, z, axis = 'y', radial = 24) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, radial);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  _buildCrankcase() {
    const g = new THREE.Group();
    g.name = 'Crankcase';
    this.root.add(g);
    this.crankcase = g;

    const housingGeo = new THREE.BoxGeometry(6.95, 1.02, 2.18);
    const housing = new THREE.Mesh(housingGeo, this.materials.ghostDeep);
    housing.position.set(0, -0.16, 0);
    g.add(housing);
    addEdges(housing, housingGeo, this.materials.edge);

    for (let i = 0; i < 5; i++) {
      const x = [-3.18, -1.7, 0, 1.7, 3.18][i];
      const cap = this._addBox(g, 0.52, 0.42, 1.42, this.materials.castAluminum, x, -0.53, 0);
      cap.castShadow = true;
      for (const z of [-0.55, 0.55]) {
        this._addCylinder(g, 0.045, 0.045, 0.16, this.materials.steelDark, x, -0.68, z, 'y', 10);
      }
      addEdges(cap, cap.geometry, this.materials.edge);
    }

    const pan = new THREE.Group();
    g.add(pan);
    this.oilPan = pan;
    this._addBox(pan, 5.8, 0.48, 1.78, this.materials.castDark, 0, -1.06, 0);
    this._addBox(pan, 5.25, 0.1, 1.58, this.materials.castDark, 0, -1.34, 0);
    for (let i = 0; i < 7; i++) {
      this._addBox(pan, 0.055, 0.18, 1.45, this.materials.steelDark, -2.4 + i * 0.8, -1.41, 0);
    }
    this._addCylinder(pan, 0.1, 0.1, 0.16, this.materials.accent, 2.48, -1.28, 0.28, 'y', 14);
    this._addBox(pan, 0.18, 0.06, 0.3, this.materials.castDark, 2.48, -1.38, 0.28);

    for (const side of [-1, 1]) {
      this._addCylinder(g, 0.18, 0.18, 0.62, this.materials.rubber, 2.55, -0.78, side * 1.15, 'z', 16);
      this._addBox(g, 0.42, 0.22, 0.4, this.materials.castDark, 2.55, -0.6, side * 1.05);
    }
    const starter = new THREE.Group();
    g.add(starter);
    this._addCylinder(starter, 0.22, 0.22, 0.64, this.materials.castDark, 2.38, -0.58, 1.38, 'x', 20);
    this._addCylinder(starter, 0.28, 0.28, 0.16, this.materials.steelDark, 2.72, -0.58, 1.38, 'x', 20);
    this._addBox(starter, 0.4, 0.18, 0.18, this.materials.copper, 2.2, -0.32, 1.38);

    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(1.18, 1.18, 0.16, 48, 1, true, 0, TAU),
      this.materials.ghost
    );
    bell.rotation.z = Math.PI / 2;
    bell.position.x = 3.48;
    g.add(bell);
  }

  _buildCrank() {
    const crank = new THREE.Group();
    crank.name = 'Crankshaft';
    this.root.add(crank);
    this.crankGroup = crank;

    this._addCylinder(crank, 0.14, 0.14, 7.15, this.materials.steelDark, 0, 0, 0, 'x', 20);
    const journalXs = [-3.15, -1.7, 0, 1.7, 3.15];
    for (const x of journalXs) {
      this._addCylinder(crank, 0.3, 0.3, 0.42, this.materials.crank, x, 0, 0, 'x', 28);
    }

    for (let p = 0; p < 4; p++) {
      const x = PIN_X[p];
      const a = PIN_BASE[p] * DEG;
      const py = Math.cos(a) * CRANK_RADIUS;
      const pz = Math.sin(a) * CRANK_RADIUS;
      const pin = this._addCylinder(crank, 0.255, 0.255, 0.55, this.materials.crank, x, py, pz, 'x', 26);
      pin.castShadow = true;
      this._addCylinder(crank, 0.045, 0.045, 0.012, this.materials.steelDark, x, py + 0.23, pz, 'y', 10);

      for (const side of [-1, 1]) {
        const web = new THREE.Mesh(makeCrankWebGeometry(PIN_BASE[p]), this.materials.crank);
        web.position.x = x + side * 0.33;
        web.castShadow = true;
        crank.add(web);
      }
    }

    const nose = new THREE.Group();
    crank.add(nose);
    this._addCylinder(nose, 0.17, 0.2, 0.55, this.materials.steelDark, -3.58, 0, 0, 'x', 20);
    this._addCylinder(nose, 0.6, 0.6, 0.27, this.materials.castDark, -3.87, 0, 0, 'x', 40);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.018, 6, 48), this.materials.steelDark);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = -3.95 + i * 0.075;
      nose.add(ring);
    }
    this._addCylinder(nose, 0.19, 0.19, 0.06, this.materials.accent, -4.03, 0, 0, 'x', 20);

    const crankSprocket = makeGearDisc(0.44, 0.16, this.materials.steelDark, 28, 0);
    crankSprocket.position.x = -3.32;
    crank.add(crankSprocket);

    const flywheel = new THREE.Group();
    flywheel.name = 'Flywheel';
    crank.add(flywheel);
    const disc = this._addCylinder(flywheel, 0.98, 0.98, 0.17, this.materials.castAluminum, 3.65, 0, 0, 'x', 48);
    disc.castShadow = true;
    this._addCylinder(flywheel, 1.08, 1.08, 0.18, this.materials.steelDark, 3.65, 0, 0, 'x', 48);
    const teeth = makeGearTeeth(64, 1.1, 0.2, 0.065, 0.1, this.materials.steelDark);
    teeth.position.x = 3.65;
    flywheel.add(teeth);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      this._addCylinder(flywheel, 0.075, 0.075, 0.03, this.materials.steelDark, 3.78, Math.cos(a) * 0.7, Math.sin(a) * 0.7, 'x', 12);
    }
    this._addCylinder(flywheel, 0.14, 0.14, 0.22, this.materials.steel, 3.78, 0, 0, 'x', 18);
  }

  _buildBanks() {
    BANK_DEFS.forEach((bank, bankIndex) => {
      const bankGroup = new THREE.Group();
      bankGroup.name = `Bank_${bank.id}`;
      bankGroup.rotation.x = bank.angle * DEG;
      this.root.add(bankGroup);
      bank.group = bankGroup;
      bank.index = bankIndex;
      this.banks.push(bank);

      this._buildBankBlock(bank);
      const headGroup = new THREE.Group();
      headGroup.name = `Head_${bank.id}`;
      bankGroup.add(headGroup);
      bank.headGroup = headGroup;
      this.explodables.push({
        object: headGroup,
        base: new THREE.Vector3(0, 0, 0),
        offset: new THREE.Vector3(0, 1.16, bank.outer * 0.32),
      });

      this._buildHeadShell(bank);

      for (const id of bank.cylinders) {
        const meta = CYLINDER_META.find((c) => c.id === id);
        const cyl = {
          ...meta,
          bank,
          bankIndex,
          x: PIN_X[meta.pin] + bank.outer * 0.1,
          fireAngle: meta.fireIndex * 90,
          offset: mod(360 - meta.fireIndex * 90, 720),
          cycle: 0,
          intakeLift: 0,
          exhaustLift: 0,
          valves: [],
          flame: 0,
        };
        this.cylinders.push(cyl);
        this.cylindersById.set(cyl.id, cyl);
        this._buildCylinderHardware(bank, cyl);
        this._buildValvetrain(bank, cyl);
        this._buildSparkPlug(bank, cyl);
        this._buildCombustionSprites(bank, cyl);
        this._addCylinderNumberPlate(bank, cyl);
      }

      this._buildCamshafts(bank);
      this._buildFuelRail(bank);
      this._buildExhaust(bank);
      this._buildValveCover(bank);
    });
  }

  _buildBankBlock(bank) {
    const g = bank.group;
    const mat = this.materials;
    const blockGroup = new THREE.Group();
    blockGroup.name = `Block_${bank.id}`;
    g.add(blockGroup);
    bank.blockGroup = blockGroup;

    // Open cutaway casting: side rails and end walls keep the block readable
    // while leaving the bores visible from every orbit angle.
    const outerPanel = this._addBox(blockGroup, 6.55, 1.56, 0.075, mat.ghost, 0, 1.7, bank.outer * 0.75);
    const innerPanel = this._addBox(blockGroup, 6.55, 1.56, 0.075, mat.ghostDeep, 0, 1.7, bank.inner * 0.75);
    addEdges(outerPanel, outerPanel.geometry, mat.edge);
    addEdges(innerPanel, innerPanel.geometry, mat.edge);

    for (const x of [-3.29, 3.29]) {
      const end = this._addBox(blockGroup, 0.09, 1.56, 1.48, mat.ghost, x, 1.7, 0);
      addEdges(end, end.geometry, mat.edge);
    }

    for (const x of [-3.36, -1.7, 0, 1.7, 3.36]) {
      const rib = this._addBox(blockGroup, 0.1, 1.52, 1.46, mat.ghostDeep, x, 1.7, 0);
      addEdges(rib, rib.geometry, mat.edge);
    }

    this._addBox(blockGroup, 6.6, 0.08, 0.12, mat.steelDark, 0, 2.48, bank.outer * 0.7);
    this._addBox(blockGroup, 6.6, 0.08, 0.12, mat.steelDark, 0, 2.48, bank.inner * 0.7);
    this._addCylinder(blockGroup, 0.035, 0.035, 6.1, mat.copper, 0, 1.12, bank.outer * 0.68, 'x', 10);
    for (const x of [-2.55, -0.85, 0.85, 2.55]) {
      this._addCylinder(blockGroup, 0.095, 0.095, 0.055, mat.steelDark, x, 1.25, bank.outer * 0.79, 'z', 16);
    }
  }

  _buildHeadShell(bank) {
    const g = bank.headGroup;
    const mat = this.materials;
    const head = this._addBox(g, 6.5, 0.46, 1.54, mat.ghost, 0, 2.77, 0);
    addEdges(head, head.geometry, mat.edgeBright);
    this._addBox(g, 6.48, 0.04, 1.5, mat.ghostDeep, 0, 2.52, 0);

    for (const z of [bank.inner * 0.21, bank.outer * 0.21]) {
      for (const x of [-3.1, -1.7, 0, 1.7, 3.1]) {
        this._addBox(g, 0.13, 0.11, 0.28, mat.steelDark, x, 2.94, z);
      }
    }

    for (const x of [-3.05, -2.05, -0.35, 1.35, 2.35, 3.05]) {
      for (const z of [bank.inner * 0.66, bank.outer * 0.66]) {
        this._addCylinder(g, 0.055, 0.055, 0.08, mat.steelDark, x, 3.0, z, 'y', 6);
      }
    }

    for (const id of bank.cylinders) {
      const cyl = this.cylindersById.get(id);
      if (!cyl) continue;
      this._addBox(g, 0.48, 0.3, 0.09, mat.exhaustMetal, cyl.x, 2.42, bank.outer * 0.77);
    }
  }

  _buildCylinderHardware(bank, cyl) {
    const g = bank.group;
    const mat = this.materials;

    const sleeveGeo = new THREE.CylinderGeometry(BORE, BORE, 1.52, 36, 1, true);
    const sleeve = new THREE.Mesh(sleeveGeo, mat.sleeve);
    sleeve.position.set(cyl.x, 1.74, 0);
    g.add(sleeve);
    cyl.sleeve = sleeve;
    for (const y of [1.0, 2.49]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(BORE + 0.006, 0.018, 6, 40), mat.steelDark);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cyl.x, y, 0);
      g.add(ring);
    }
    const jacket = new THREE.Mesh(new THREE.TorusGeometry(BORE + 0.07, 0.012, 5, 40), mat.cyan);
    jacket.rotation.x = Math.PI / 2;
    jacket.position.set(cyl.x, 1.38, 0);
    g.add(jacket);

    const piston = new THREE.Group();
    piston.name = `Piston_${cyl.id}`;
    g.add(piston);
    cyl.pistonGroup = piston;
    const body = this._addCylinder(piston, 0.354, 0.366, 0.46, mat.piston, 0, 0.03, 0, 'y', 32);
    body.castShadow = true;
    this._addCylinder(piston, 0.354, 0.354, 0.035, mat.piston, 0, 0.27, 0, 'y', 32);
    const crown = this._addCylinder(piston, 0.3, 0.34, 0.025, mat.steelDark, 0, 0.288, 0, 'y', 24);
    crown.scale.y = 0.4;
    for (const y of [0.135, 0.175, 0.215]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.363, 0.014, 6, 36), mat.steelDark);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      piston.add(ring);
    }
    this._addCylinder(piston, 0.115, 0.115, 0.63, mat.steel, 0, 0, 0, 'x', 18);
    this._addCylinder(piston, 0.15, 0.15, 0.04, mat.steelDark, 0.31, 0, 0, 'x', 18);
    this._addCylinder(piston, 0.15, 0.15, 0.04, mat.steelDark, -0.31, 0, 0, 'x', 18);

    const rod = new THREE.Group();
    rod.name = `Rod_${cyl.id}`;
    g.add(rod);
    cyl.rodGroup = rod;
    const L = ROD_LENGTH;
    const shaft = this._addBox(rod, 0.17, L - 0.38, 0.075, mat.rod, 0, L / 2, 0);
    shaft.castShadow = true;
    this._addBox(rod, 0.095, L - 0.42, 0.17, mat.rod, 0, L / 2, 0);
    for (const z of [-0.075, 0.075]) {
      this._addBox(rod, 0.045, L - 0.45, 0.035, mat.steelDark, 0, L / 2, z);
    }
    const bigEnd = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.055, 8, 24), mat.rod);
    bigEnd.rotation.y = Math.PI / 2;
    rod.add(bigEnd);
    const bigBearing = this._addCylinder(rod, 0.19, 0.19, 0.2, mat.steelDark, 0, 0, 0, 'x', 20);
    bigBearing.scale.set(0.55, 1, 0.55);
    const smallEnd = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.045, 8, 20), mat.rod);
    smallEnd.rotation.y = Math.PI / 2;
    smallEnd.position.y = L;
    rod.add(smallEnd);
    this._addCylinder(rod, 0.12, 0.12, 0.18, mat.copper, 0, L, 0, 'x', 16);
  }

  _buildValvetrain(bank, cyl) {
    const g = bank.headGroup;
    const mat = this.materials;
    const positions = [
      { side: 'intake', dx: -0.16, z: bank.inner * 0.21 },
      { side: 'intake', dx: 0.16, z: bank.inner * 0.21 },
      { side: 'exhaust', dx: -0.16, z: bank.outer * 0.21 },
      { side: 'exhaust', dx: 0.16, z: bank.outer * 0.21 },
    ];
    const springGeo = springGeometry(0.068, 0.255, 6, 0.011);
    cyl.valves = [];

    for (const p of positions) {
      const vx = cyl.x + p.dx;
      const valve = new THREE.Group();
      valve.name = `Valve_${p.side}_${cyl.id}`;
      g.add(valve);
      const seatY = 2.485;
      valve.position.set(vx, seatY, p.z);

      const head = this._addCylinder(valve, 0.095, 0.135, 0.045, mat.valve, 0, -0.018, 0, 'y', 20);
      head.castShadow = true;
      this._addCylinder(valve, 0.025, 0.031, 0.5, mat.valve, 0, 0.27, 0, 'y', 12);
      this._addCylinder(valve, 0.072, 0.072, 0.035, mat.steelDark, 0, 0.485, 0, 'y', 16);
      const collar = this._addCylinder(
        valve,
        0.085,
        0.085,
        0.04,
        p.side === 'intake' ? mat.cyan : mat.accent,
        0,
        0.505,
        0,
        'y',
        16
      );
      collar.castShadow = true;

      const spring = new THREE.Mesh(springGeo, mat.spring);
      spring.position.set(vx, 2.535, p.z);
      spring.castShadow = true;
      spring.userData.noMerge = true;
      g.add(spring);

      cyl.valves.push({ group: valve, spring, springBaseY: 2.535, seatY, side: p.side, dx: p.dx, z: p.z });
    }
  }

  _buildCamshafts(bank) {
    const mat = this.materials;
    const camLobeGeo = makeCamLobeGeometry();
    for (const side of ['intake', 'exhaust']) {
      const z = side === 'intake' ? bank.inner * 0.21 : bank.outer * 0.21;
      const cam = new THREE.Group();
      cam.name = `Camshaft_${side}_${bank.id}`;
      cam.position.set(0, 3.0, z);
      bank.headGroup.add(cam);

      const shaft = this._addCylinder(cam, 0.095, 0.095, 6.5, mat.steelDark, 0, 0, 0, 'x', 18);
      shaft.castShadow = true;
      for (const x of [-3.15, -1.7, 0, 1.7, 3.15]) {
        this._addCylinder(cam, 0.135, 0.135, 0.16, mat.castDark, x, 0, 0, 'x', 20);
      }
      for (const id of bank.cylinders) {
        const cyl = this.cylindersById.get(id);
        for (const dx of [-0.16, 0.16]) {
          const lobe = new THREE.Mesh(camLobeGeo, mat.steel);
          lobe.castShadow = true;
          lobe.position.x = cyl.x + dx;
          const peakCycle = side === 'intake' ? 810 : 615;
          const apexCrank = mod(peakCycle - cyl.offset, 720);
          lobe.rotation.x = Math.PI - (apexCrank * DEG) / 2;
          cam.add(lobe);
        }
      }

      const sprocket = makeGearDisc(0.3, 0.12, mat.steelDark, 22, 0);
      sprocket.position.x = -3.16;
      cam.add(sprocket);
      this._addCylinder(cam, 0.085, 0.085, 0.1, mat.accent, -3.16, 0, 0, 'x', 14);
      this.camshafts.push({ group: cam, side, bank });
    }
  }

  _buildSparkPlug(bank, cyl) {
    const g = bank.headGroup;
    const plug = new THREE.Group();
    plug.position.set(cyl.x, 2.7, 0);
    g.add(plug);
    this._addCylinder(plug, 0.075, 0.09, 0.19, this.materials.steelDark, 0, 0, 0, 'y', 12);
    this._addCylinder(plug, 0.098, 0.098, 0.11, this.materials.castAluminum, 0, 0.13, 0, 'y', 6);
    this._addCylinder(plug, 0.058, 0.07, 0.17, this.materials.steel, 0, 0.25, 0, 'y', 12);
    this._addCylinder(plug, 0.035, 0.035, 0.12, this.materials.copper, 0, 0.38, 0, 'y', 10);
    const cap = this._addCylinder(plug, 0.075, 0.06, 0.08, this.materials.castDark, 0, 0.46, 0, 'y', 12);
    cap.castShadow = true;
  }

  _buildCombustionSprites(bank, cyl) {
    const outerMat = new THREE.SpriteMaterial({
      map: this.flameTexture,
      color: 0xff7a2a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    const outer = new THREE.Sprite(outerMat);
    outer.scale.setScalar(1.1);
    outer.position.set(cyl.x, 2.42, 0);
    outer.renderOrder = 7;
    bank.group.add(outer);

    const coreMat = new THREE.SpriteMaterial({
      map: this.sparkTexture,
      color: 0xd8f4ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    const core = new THREE.Sprite(coreMat);
    core.scale.setScalar(0.3);
    core.position.set(cyl.x, 2.48, 0);
    core.renderOrder = 8;
    bank.group.add(core);

    const flameMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff8a3a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      })
    );
    flameMesh.position.set(cyl.x, 2.4, 0);
    flameMesh.renderOrder = 9;
    bank.group.add(flameMesh);

    cyl.flameSprite = outer;
    cyl.flameCore = core;
    cyl.flameMesh = flameMesh;
  }

  _addCylinderNumberPlate(bank, cyl) {
    const texture = makePlateTexture(String(cyl.id).padStart(2, '0'), cyl.bank.id === 'R' ? '#ff7a38' : '#5cdcff');
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0.9,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), mat);
    plane.position.set(cyl.x, 2.17, bank.outer * 0.795);
    plane.rotation.y = bank.outer > 0 ? 0 : Math.PI;
    bank.group.add(plane);
  }

  _buildValveCover(bank) {
    const g = bank.headGroup;
    const mat = this.materials;
    const cover = this._addBox(g, 6.15, 0.25, 1.28, mat.coverGhost, 0, 3.22, 0);
    addEdges(cover, cover.geometry, mat.edgeBright);
    this._addBox(g, 6.3, 0.035, 0.08, mat.accentSoft, 0, 3.34, bank.outer * 0.44);
    this._addBox(g, 6.3, 0.035, 0.08, mat.steelDark, 0, 3.34, bank.inner * 0.44);

    for (const x of [-2.55, -0.85, 0.85, 2.55]) {
      this._addBox(g, 0.065, 0.03, 1.0, mat.steelDark, x, 3.35, 0);
    }

    const logo = makeTextTexture('V8  •  32V', {
      width: 768,
      height: 160,
      color: '#dce8ef',
      accent: '#ff6b2c',
      font: '700 72px Bahnschrift, "Arial Narrow", sans-serif',
      letterSpacing: '10px',
      subtext: 'DOHC  CROSS-PLANE',
    });
    const logoMat = new THREE.MeshBasicMaterial({
      map: logo,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0.86,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), logoMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, 3.345, 0);
    g.add(plane);

    this._addCylinder(g, 0.13, 0.13, 0.08, mat.castDark, -2.45, 3.38, bank.outer * 0.34, 'y', 12);
  }

  _buildFuelRail(bank) {
    const g = bank.headGroup;
    const mat = this.materials;
    const z = bank.inner * 0.42;
    this._addCylinder(g, 0.045, 0.045, 5.7, mat.copper, 0, 2.55, z, 'x', 10);
    for (const id of bank.cylinders) {
      const cyl = this.cylindersById.get(id);
      if (!cyl) continue;
      this._addCylinder(g, 0.055, 0.04, 0.17, mat.accent, cyl.x, 2.46, z, 'y', 10);
      this._addCylinder(g, 0.035, 0.035, 0.08, mat.steelDark, cyl.x, 2.37, z, 'y', 8);
    }
  }

  _buildExhaust(bank) {
    const mat = this.materials;
    const g = new THREE.Group();
    g.name = `Exhaust_${bank.id}`;
    bank.group.add(g);
    bank.exhaustGroup = g;
    this.explodables.push({
      object: g,
      base: new THREE.Vector3(0, 0, 0),
      offset: new THREE.Vector3(0, 0.16, bank.outer * 0.82),
    });

    const collector = this._addCylinder(g, 0.18, 0.18, 4.4, mat.exhaustMetal, 0, 1.14, bank.outer * 1.3, 'x', 18);
    collector.castShadow = true;
    this._addCylinder(g, 0.22, 0.22, 0.09, mat.exhaustHot, -2.18, 1.14, bank.outer * 1.3, 'x', 18);
    this._addCylinder(g, 0.22, 0.22, 0.09, mat.exhaustHot, 2.18, 1.14, bank.outer * 1.3, 'x', 18);

    for (const id of bank.cylinders) {
      const cyl = this.cylindersById.get(id);
      if (!cyl) continue;
      const pts = [
        new THREE.Vector3(cyl.x, 2.37, bank.outer * 0.34),
        new THREE.Vector3(cyl.x + 0.07, 2.05, bank.outer * 0.72),
        new THREE.Vector3(cyl.x - 0.05, 1.6, bank.outer * 1.03),
        new THREE.Vector3(cyl.x, 1.14, bank.outer * 1.27),
      ];
      const { curve, geo } = tubeFromPoints(pts, 0.105, 22);
      const pipe = new THREE.Mesh(geo, mat.exhaustMetal);
      pipe.castShadow = true;
      g.add(pipe);
      const flange = this._addBox(g, 0.42, 0.3, 0.07, mat.exhaustHot, cyl.x, 2.42, bank.outer * 0.77);
      flange.castShadow = true;

      const glow = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.012, 6, 22), mat.accent);
      glow.rotation.x = Math.PI / 2;
      glow.position.set(cyl.x, 2.36, bank.outer * 0.77);
      g.add(glow);

      const worldPts = pts.map((p) => this.worldFromBank(bank, p.x, p.y, p.z));
      this.flowCurves.push({ kind: 'exhaust', cylinder: cyl, curve: new THREE.CatmullRomCurve3(worldPts) });
    }

    const outlet = [
      new THREE.Vector3(2.18, 1.14, bank.outer * 1.3),
      new THREE.Vector3(3.0, 1.12, bank.outer * 1.34),
      new THREE.Vector3(3.55, 0.94, bank.outer * 1.36),
      new THREE.Vector3(3.9, 0.55, bank.outer * 1.36),
    ];
    const { geo: outletGeo } = tubeFromPoints(outlet, 0.16, 20);
    g.add(new THREE.Mesh(outletGeo, mat.exhaustMetal));
  }

  _buildIntake() {
    const group = new THREE.Group();
    group.name = 'IntakeManifold';
    this.root.add(group);
    this.intakeGroup = group;
    this.explodables.push({
      object: group,
      base: new THREE.Vector3(0, 0, 0),
      offset: new THREE.Vector3(0, 1.3, 0),
    });
    const mat = this.materials;

    const plenumGeo = new THREE.CapsuleGeometry(0.36, 2.9, 8, 28);
    plenumGeo.rotateZ(Math.PI / 2);
    const plenum = new THREE.Mesh(plenumGeo, mat.castAluminum);
    plenum.position.set(0, 2.61, 0);
    plenum.scale.set(1, 1, 1.2);
    plenum.castShadow = true;
    group.add(plenum);
    addEdges(plenum, plenumGeo, mat.edgeBright);

    this._addBox(group, 3.25, 0.08, 0.72, mat.castDark, 0, 2.93, 0);
    const badge = makeTextTexture('V8', {
      width: 256,
      height: 128,
      color: '#ff8a4c',
      accent: '#ff5d1a',
      font: '800 86px Bahnschrift, "Arial Narrow", sans-serif',
      letterSpacing: '4px',
    });
    const badgePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.35),
      new THREE.MeshBasicMaterial({ map: badge, transparent: true, depthWrite: false })
    );
    badgePlane.rotation.x = -Math.PI / 2;
    badgePlane.position.set(0, 2.98, 0);
    group.add(badgePlane);

    const throttle = new THREE.Group();
    group.add(throttle);
    throttle.position.set(-2.28, 2.61, 0);
    this._addCylinder(throttle, 0.33, 0.33, 0.58, mat.castDark, 0, 0, 0, 'x', 28);
    this._addCylinder(throttle, 0.37, 0.37, 0.06, mat.steelDark, -0.25, 0, 0, 'x', 28);
    this._addCylinder(throttle, 0.37, 0.37, 0.06, mat.steelDark, 0.25, 0, 0, 'x', 28);
    const pivot = new THREE.Group();
    throttle.add(pivot);
    this.throttlePlate = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 24),
      new THREE.MeshStandardMaterial({ color: 0xa7b5c0, metalness: 0.9, roughness: 0.24, side: THREE.DoubleSide })
    );
    this.throttlePlate.rotation.y = Math.PI / 2;
    pivot.add(this.throttlePlate);
    this._addCylinder(throttle, 0.025, 0.025, 0.66, mat.steel, 0, 0, 0, 'z', 10);
    this.throttlePivot = pivot;

    for (const bank of this.banks) {
      for (const id of bank.cylinders) {
        const cyl = this.cylindersById.get(id);
        if (!cyl) continue;
        const port = this.worldFromBank(bank, cyl.x, 2.43, bank.inner * 0.3);
        const sideSign = Math.sign(port.z) || 1;
        const start = new THREE.Vector3(cyl.x * 0.92, 2.61, sideSign * 0.44);
        const mid = new THREE.Vector3(cyl.x * 0.96, 2.47, sideSign * 0.98);
        const end = new THREE.Vector3(cyl.x, port.y, port.z);
        const { curve, geo } = tubeFromPoints([start, mid, end], 0.1, 20);
        const runner = new THREE.Mesh(geo, mat.intakeMetal);
        runner.castShadow = true;
        group.add(runner);
        const bell = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 6, 20), mat.cyan);
        bell.position.copy(start);
        bell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangentAt(0).normalize());
        group.add(bell);
        this.flowCurves.push({ kind: 'intake', cylinder: cyl, curve });
      }
    }
  }

  _buildTimingDrive() {
    const group = new THREE.Group();
    group.name = 'TimingDrive';
    this.root.add(group);
    this.timingGroup = group;
    const mat = this.materials;

    for (const bank of this.banks) {
      const camIn = this.worldFromBank(bank, -3.16, 3.0, bank.inner * 0.21);
      const camOut = this.worldFromBank(bank, -3.16, 3.0, bank.outer * 0.21);
      const pts = [
        new THREE.Vector3(-3.22, camIn.y + 0.36, camIn.z),
        new THREE.Vector3(-3.22, Math.max(camIn.y, camOut.y) + 0.44, (camIn.z + camOut.z) / 2),
        new THREE.Vector3(-3.22, camOut.y + 0.36, camOut.z),
        new THREE.Vector3(-3.22, camOut.y - 0.12, camOut.z + bank.outer * 0.36),
        new THREE.Vector3(-3.22, 0.5, bank.outer * 0.44),
        new THREE.Vector3(-3.22, -0.46, bank.outer * 0.22),
        new THREE.Vector3(-3.22, -0.47, -bank.outer * 0.12),
        new THREE.Vector3(-3.22, 0.35, -bank.outer * 0.38),
        new THREE.Vector3(-3.22, camIn.y - 0.1, camIn.z - bank.outer * 0.34),
      ];
      const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.2);
      const chainGeo = new THREE.TubeGeometry(curve, 90, 0.027, 6, true);
      const chain = new THREE.Mesh(chainGeo, mat.steelDark);
      chain.castShadow = true;
      group.add(chain);

      const linkGeo = new THREE.BoxGeometry(0.055, 0.022, 0.085);
      const links = new THREE.InstancedMesh(linkGeo, mat.steelDark, 54);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < 54; i++) {
        const t = i / 54;
        const pos = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        q.setFromUnitVectors(up, tangent);
        m.compose(pos, q, new THREE.Vector3(1, 1, 1));
        links.setMatrixAt(i, m);
      }
      links.instanceMatrix.needsUpdate = true;
      group.add(links);
    }

    const cover = new THREE.Group();
    group.add(cover);
    this.timingCover = cover;
    const coverGeo = new THREE.BoxGeometry(0.1, 3.16, 2.88);
    const coverMesh = new THREE.Mesh(coverGeo, mat.coverGhost);
    coverMesh.position.set(-3.62, 1.27, 0);
    cover.add(coverMesh);
    addEdges(coverMesh, coverGeo, mat.edgeBright);
    this._addBox(cover, 0.035, 0.055, 2.3, mat.accentSoft, -3.68, 2.46, 0);
    for (const y of [0.0, 2.5]) {
      for (const z of [-1.22, 1.22]) {
        this._addCylinder(cover, 0.05, 0.05, 0.04, mat.steelDark, -3.69, y, z, 'x', 10);
      }
    }
    this.explodables.push({
      object: cover,
      base: new THREE.Vector3(0, 0, 0),
      offset: new THREE.Vector3(-0.85, 0, 0),
    });

    const frontLogo = makeTextTexture('V8  //  5.0L', {
      width: 768,
      height: 256,
      color: '#d8e6ee',
      accent: '#ff6b2c',
      font: '700 82px Bahnschrift, "Arial Narrow", sans-serif',
      letterSpacing: '12px',
      subtext: '32 VALVE  •  DOHC',
    });
    const logoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 0.8),
      new THREE.MeshBasicMaterial({ map: frontLogo, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.9 })
    );
    logoPlane.position.set(-3.685, 1.22, 0);
    logoPlane.rotation.y = -Math.PI / 2;
    cover.add(logoPlane);

    const accessory = new THREE.Group();
    group.add(accessory);
    this._addCylinder(accessory, 0.29, 0.29, 0.64, mat.castAluminum, -3.85, 0.72, 1.28, 'x', 24);
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.018, 5, 28), mat.castDark);
      r.rotation.y = Math.PI / 2;
      r.position.set(-3.98 + i * 0.08, 0.72, 1.28);
      accessory.add(r);
    }
    this._addCylinder(accessory, 0.24, 0.24, 0.1, mat.steelDark, -4.12, 0.72, 1.28, 'x', 28);
    this._addBox(accessory, 0.7, 0.16, 0.2, mat.castDark, -3.55, 0.35, 1.28);

    const beltCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-4.12, 1.52, 0.0),
        new THREE.Vector3(-4.12, 0.72, 1.02),
        new THREE.Vector3(-4.12, 0.98, 1.54),
        new THREE.Vector3(-4.12, 0.46, 1.28),
        new THREE.Vector3(-4.12, -0.05, 0.92),
        new THREE.Vector3(-4.12, 0.2, 0.25),
      ],
      true,
      'catmullrom',
      0.3
    );
    accessory.add(new THREE.Mesh(new THREE.TubeGeometry(beltCurve, 80, 0.028, 5, true), mat.rubber));
  }

  _buildEffects() {
    this.combustionLight = new THREE.PointLight(0xff7228, 0, 5.5, 2);
    this.combustionLight.position.set(0, 2.1, 0);
    this.root.add(this.combustionLight);

    this.pilotLights = [];
    for (const bank of this.banks) {
      for (const id of bank.cylinders) {
        const cyl = this.cylindersById.get(id);
        const light = new THREE.PointLight(0xff6b2c, 0, 1.2, 2);
        light.position.set(cyl.x, 2.32, 0);
        bank.group.add(light);
        this.pilotLights.push({ light, cyl });
      }
    }
  }

  _buildFlowParticles() {
    const countPerCurve = 3;
    const data = [];
    for (const entry of this.flowCurves) {
      for (let i = 0; i < countPerCurve; i++) {
        data.push({
          curve: entry.curve,
          kind: entry.kind,
          cyl: entry.cylinder,
          offset: (i + Math.random() * 0.6) / countPerCurve,
        });
      }
    }
    const positions = new Float32Array(data.length * 3);
    const colors = new Float32Array(data.length * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.075,
      map: this.flowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.root.add(points);
    this.flowParticles = { data, positions, colors, geo, points, enabled: true, time: 0 };
  }

  _setupLabels() {
    const right = this.banks[0];
    const left = this.banks[1];
    this.labelAnchors = [
      {
        id: 'crank',
        index: '01',
        side: 'right',
        title: 'CROSS-PLANE CRANKSHAFT',
        sub: '90° throws · five main bearings',
        position: () => new THREE.Vector3(0.55, 0.02, 0.25),
      },
      {
        id: 'intake',
        index: '02',
        side: 'left',
        title: 'INTAKE PLENUM',
        sub: 'Tuned runners · drive-by-wire throttle',
        position: () => new THREE.Vector3(-0.15, 3.18, 0.1),
      },
      {
        id: 'cam',
        index: '03',
        side: 'left',
        title: 'DOHC CAMSHAFTS',
        sub: 'Half-speed drive · 32 valves',
        position: () => this.worldFromBank(right, 1.85, 3.08, right.inner * 0.22).add(new THREE.Vector3(0, 0.16, 0)),
      },
      {
        id: 'exhaust',
        index: '04',
        side: 'right',
        title: 'EXHAUST HEADERS',
        sub: 'Equal-length primaries · 4-into-1',
        position: () => this.worldFromBank(left, 2.0, 1.1, left.outer * 1.45),
      },
    ];
  }

  _applyMode(mode, instant = 0.2) {
    this.mode = mode;
    applyModeMaterials(this.materials, mode, instant);
    const glow = mode === 'combustion' ? 1.35 : mode === 'xray' ? 0.8 : 1;
    this.materials.accent.emissiveIntensity = 1.15 * glow;
    this.materials.cyan.emissiveIntensity = 1.0 * glow;
  }

  setMode(mode) {
    this._applyMode(mode, 0.35);
  }

  update(dt, state) {
    this.elapsed += dt;
    const A = mod(state.crankAngle, 720);
    this.crankAngle = A;

    this.crankGroup.rotation.x = A * DEG;
    for (const cam of this.camshafts) {
      cam.group.rotation.x = (A * 0.5) * DEG;
    }

    const targetExplode = state.mode === 'exploded' ? 1 : 0;
    this.explode = damp(this.explode, targetExplode, 4.5, dt);
    const e = this.explode;
    for (const item of this.explodables) {
      item.object.position.copy(item.base).addScaledVector(item.offset, e);
    }
    if (this.throttlePivot) {
      this.throttlePivot.rotation.y = THREE.MathUtils.lerp(
        this.throttlePivot.rotation.y,
        (0.08 + state.throttle * 0.86) * Math.PI * 0.5,
        1 - Math.exp(-dt * 10)
      );
    }

    this._applyMode(state.mode, 0.06);

    this.maxFlame = 0;
    let strongestCyl = null;
    for (const cyl of this.cylinders) {
      const cycle = mod(A + cyl.offset, 720);
      cyl.cycle = cycle;
      const rad = cycle * DEG;
      const sin = Math.sin(rad);
      const s =
        CRANK_RADIUS * Math.cos(rad) +
        Math.sqrt(ROD_LENGTH * ROD_LENGTH - CRANK_RADIUS * CRANK_RADIUS * sin * sin);
      cyl.pistonTravel = s;

      cyl.pistonGroup.position.set(cyl.x, s, 0);

      const alpha = (A + PIN_BASE[cyl.pin] - cyl.bank.angle) * DEG;
      const pinLocal = new THREE.Vector3(
        PIN_X[cyl.pin],
        CRANK_RADIUS * Math.cos(alpha),
        CRANK_RADIUS * Math.sin(alpha)
      );
      const smallEnd = new THREE.Vector3(cyl.x, s, 0);
      const dir = smallEnd.clone().sub(pinLocal);
      cyl.rodGroup.position.copy(pinLocal);
      cyl.rodGroup.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize());

      const intakeLift = this._valveLift(cycle, 700, 220);
      const exhaustLift = this._valveLift(cycle, 500, 235);
      cyl.intakeLift = intakeLift;
      cyl.exhaustLift = exhaustLift;

      for (const v of cyl.valves) {
        const lift = v.side === 'intake' ? intakeLift : exhaustLift;
        v.group.position.y = v.seatY - lift * 0.145;
        v.spring.scale.y = 1 - lift * 0.26;
      }

      let flame = 0;
      let core = 0;
      if (state.enginePhase === 'running' && cycle >= 352 && cycle < 530) {
        const t = (cycle - 352) / 178;
        flame = Math.exp(-t * 3.35) * (0.3 + 0.7 * state.throttle);
        core = Math.exp(-t * 7.8) * (0.35 + 0.65 * state.throttle);
      }
      cyl.flame = flame;
      cyl.flameSprite.material.opacity = clamp(flame * 0.95, 0, 1);
      const scale = 0.5 + flame * 1.28 + 0.08 * Math.sin(this.elapsed * 50 + cyl.id);
      cyl.flameSprite.scale.setScalar(scale);
      cyl.flameCore.material.opacity = clamp(core * 1.15, 0, 1);
      cyl.flameCore.scale.setScalar(0.14 + core * 0.48);
      cyl.flameMesh.material.opacity = clamp(flame * 0.82, 0, 1);
      cyl.flameMesh.scale.setScalar(0.55 + flame * 1.8);
      cyl.flameMesh.position.y = 2.4 + Math.sin(this.elapsed * 44 + cyl.id * 2) * 0.025;

      if (flame > this.maxFlame) {
        this.maxFlame = flame;
        strongestCyl = cyl;
      }
    }

    if (strongestCyl) {
      const p = this.worldFromBank(strongestCyl.bank, strongestCyl.x, 2.2, 0);
      this.combustionLight.position.copy(p);
      this.combustionLight.intensity = this.maxFlame * 26;
      this.combustionLight.color.setHSL(0.075, 1, 0.52);
    } else {
      this.combustionLight.intensity = 0;
    }

    for (const pilot of this.pilotLights) {
      pilot.light.intensity = pilot.cyl.flame * 4.2;
    }

    if (this.flowParticles) {
      const fp = this.flowParticles;
      fp.time += dt * (0.36 + (state.rpm / REDLINE) * 1.4);
      fp.enabled = state.showFlow && state.enginePhase !== 'off';
      fp.points.visible = fp.enabled;
      if (fp.enabled) {
        const p = fp.positions;
        const c = fp.colors;
        const cyan = new THREE.Color(0x5be3ff);
        const orange = new THREE.Color(0xff7a33);
        for (let i = 0; i < fp.data.length; i++) {
          const d = fp.data[i];
          const lift = d.kind === 'intake' ? d.cyl.intakeLift : d.cyl.exhaustLift;
          const active = lift > 0.025 && state.enginePhase === 'running';
          if (active) {
            const t = mod(fp.time + d.offset, 1);
            const vec = d.curve.getPointAt(t);
            p[i * 3] = vec.x;
            p[i * 3 + 1] = vec.y;
            p[i * 3 + 2] = vec.z;
            const col = d.kind === 'intake' ? cyan : orange;
            const energy = lift * (d.kind === 'intake' ? 0.9 : 1.0);
            c[i * 3] = col.r * energy;
            c[i * 3 + 1] = col.g * energy;
            c[i * 3 + 2] = col.b * energy;
          } else {
            p[i * 3] = 0;
            p[i * 3 + 1] = -20;
            p[i * 3 + 2] = 0;
            c[i * 3] = 0;
            c[i * 3 + 1] = 0;
            c[i * 3 + 2] = 0;
          }
        }
        fp.geo.attributes.position.needsUpdate = true;
        fp.geo.attributes.color.needsUpdate = true;
      }
    }

    const eventIndex = Math.floor(A / 90) % 8;
    this.activeCylinder = FIRING_ORDER[eventIndex];
  }

  _valveLift(cycle, start, duration) {
    const p = mod(cycle - start, 720);
    if (p >= duration) return 0;
    const x = p / duration;
    return Math.pow(Math.sin(Math.PI * x), 0.85);
  }

  getFocusCylinder(id) {
    return this.cylindersById.get(id) || this.cylinders[0];
  }

  dispose() {
    this.scene.remove(this.root);
  }
}
