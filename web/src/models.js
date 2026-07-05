// Procedural low-poly models for Dead Rush (no external assets).
import * as THREE from 'three';

const MAT_CACHE = new Map();
export function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  if (!MAT_CACHE.has(key)) {
    MAT_CACHE.set(key, new THREE.MeshStandardMaterial({
      color, flatShading: true, roughness: opts.roughness ?? 0.85,
      metalness: opts.metalness ?? 0.05,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
    }));
  }
  return MAT_CACHE.get(key);
}

export function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.mat || mat(color, opts));
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  return m;
}

function cyl(rt, rb, h, color, seg = 6, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------------- Humanoid rig ----------------
// Convention: +z is the model's FRONT (face, gun, reaching arms all on +z).
// Returns a group with userData refs { lLeg, rLeg, lArm, rArm, head, torso }.
function humanoid({ skin, shirt, pants, scale = 1 }) {
  const g = new THREE.Group();
  // torso: chest + waist for a less cubic silhouette
  const torso = new THREE.Group(); torso.position.y = 1.02;
  const chest = box(0.6, 0.46, 0.34, shirt); chest.position.y = 0.14; torso.add(chest);
  const waist = box(0.5, 0.3, 0.3, pants); waist.position.y = -0.24; torso.add(waist);
  g.add(torso);
  // head + neck
  const neck = cylMat(0.08, 0.1, 0.12, 6, mat(skin));
  neck.position.y = 1.44; g.add(neck);
  const head = box(0.36, 0.36, 0.36, skin); head.position.y = 1.66; g.add(head);
  const mkLeg = (x) => {
    const p = new THREE.Group(); p.position.set(x, 0.72, 0);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.62, 6), mat(pants));
    l.castShadow = true; l.position.y = -0.31; p.add(l);
    const foot = box(0.18, 0.11, 0.32, 0x2a2622); foot.position.set(0, -0.63, 0.06); p.add(foot);
    g.add(p); return p;
  };
  const mkArm = (x) => {
    const p = new THREE.Group(); p.position.set(x, 1.3, 0);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.52, 6), mat(shirt));
    a.castShadow = true; a.position.y = -0.26; p.add(a);
    const hand = box(0.13, 0.13, 0.13, skin); hand.position.y = -0.56; p.add(hand);
    g.add(p); return p;
  };
  const lLeg = mkLeg(-0.17), rLeg = mkLeg(0.17);
  const lArm = mkArm(-0.4), rArm = mkArm(0.4);
  g.scale.setScalar(scale);
  g.userData = { lLeg, rLeg, lArm, rArm, head, torso };
  return g;
}

// small helper so humanoid can use cyl with material later
function cylMat(rt, rb, h, seg, material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------------- Hero ----------------
export function makeHero(tint = 0x3f7f46) {
  const g = humanoid({ skin: 0xd9a066, shirt: tint, pants: 0x3a4046 });
  const u = g.userData;
  // helmet with brim + goggles on the FRONT (+z)
  const helmet = box(0.42, 0.2, 0.42, 0x2f5233); helmet.position.y = 1.86; g.add(helmet);
  const brim = box(0.46, 0.05, 0.5, 0x27452b); brim.position.set(0, 1.77, 0.04); g.add(brim);
  const visor = box(0.34, 0.09, 0.05, 0x1c1f24); visor.position.set(0, 1.7, 0.2); g.add(visor);
  // vest + pouches on chest front, backpack on the back (-z)
  const vest = box(0.64, 0.4, 0.4, 0x2b2f33); vest.position.y = 1.14; g.add(vest);
  const pouch = box(0.16, 0.14, 0.08, 0x4a4438); pouch.position.set(-0.14, 1.06, 0.24); g.add(pouch);
  const pouch2 = pouch.clone(); pouch2.position.x = 0.14; g.add(pouch2);
  const pack = box(0.42, 0.48, 0.18, 0x5b4a2f); pack.position.set(0, 1.12, -0.3); g.add(pack);
  const roll = cylMat(0.09, 0.09, 0.4, 6, mat(0x6e5b3a)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 1.42, -0.3); g.add(roll);
  // rifle pointing FORWARD (+z)
  const gun = new THREE.Group();
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x23262b, flatShading: true, metalness: 0.5, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.52), gunMat);
  body.castShadow = true; gun.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.52, 8), gunMat);
  barrel.castShadow = true; barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, 0.48); gun.add(barrel);
  const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.52, 8), gunMat);
  barrel2.castShadow = true; barrel2.rotation.x = Math.PI / 2; barrel2.position.set(0, 0.12, 0.48); barrel2.visible = false; gun.add(barrel2);
  const brake = box(0.06, 0.06, 0.1, 0x101215); brake.position.set(0, 0.02, 0.76); gun.add(brake);
  const sight = box(0.04, 0.07, 0.14, 0x14161a); sight.position.set(0, 0.14, 0.02); gun.add(sight);
  const magazine = box(0.06, 0.2, 0.1, 0x2c2f34); magazine.position.set(0, -0.16, 0.08); magazine.rotation.x = 0.25; gun.add(magazine);
  const stock = box(0.07, 0.13, 0.24, 0x4a3624); stock.position.set(0, -0.02, -0.34); gun.add(stock);
  gun.position.set(0.34, 1.2, 0.5);
  g.add(gun);
  // arms raised, holding the rifle forward
  u.lArm.rotation.x = -1.15; u.rArm.rotation.x = -1.15;
  // muzzle flash on the muzzle (+z)
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xffd77a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flash.position.set(0.34, 1.22, 1.35); flash.rotation.y = Math.PI / 4; flash.visible = false;
  g.add(flash);
  const flash2 = flash.clone(); flash2.rotation.y = -Math.PI / 4; flash2.visible = false; g.add(flash2);
  u.gun = gun; u.flash = [flash, flash2];
  u.gunMat = gunMat; u.gunBarrels = [barrel, barrel2];
  u.muzzleOffset = new THREE.Vector3(0.34, 1.22, 1.3);
  return g;
}

// Apply weapon tier visuals to a hero rig: 0 rifle / 1 dual / 2 plasma minigun.
export function applyGunTier(u, tier) {
  u.gunBarrels[1].visible = tier >= 1;
  const s = tier >= 1 ? 1.6 : 1;
  u.gunBarrels.forEach(b => b.scale.set(s, tier >= 2 ? 1.15 : 1, s));
  if (tier >= 2) { u.gunMat.color.set(0x2a4a66); u.gunMat.emissive.set(0x1a66aa); u.gunMat.emissiveIntensity = 0.7; }
  else { u.gunMat.color.set(0x23262b); u.gunMat.emissive.set(0x000000); }
}

// ---------------- Zombies ----------------
export const ZOMBIE_TYPES = {
  walker: { hp: 3, speed: 2.3, dmg: 8, scale: 1.0, skin: 0x7da05f, shirt: 0x53575e, pants: 0x3d3a35, score: 1 },
  runner: { hp: 2, speed: 4.6, dmg: 7, scale: 0.92, skin: 0x94b06a, shirt: 0x6e4444, pants: 0x2f2c28, score: 2 },
  brute: { hp: 30, speed: 1.6, dmg: 14, scale: 1.7, skin: 0x63855c, shirt: 0x44484f, pants: 0x33302b, score: 8 },
  boss: { hp: 280, speed: 1.25, dmg: 22, scale: 2.9, skin: 0x5c7a50, shirt: 0x3c3f45, pants: 0x2c2a26, score: 40 },
};

export function makeZombie(type) {
  const t = ZOMBIE_TYPES[type];
  const g = humanoid({ skin: t.skin, shirt: t.shirt, pants: t.pants, scale: t.scale });
  const u = g.userData;
  // shamble: arms reach FORWARD (+z), hunch forward
  u.lArm.rotation.x = -Math.PI / 2; u.rArm.rotation.x = -Math.PI / 2;
  u.torso.rotation.x = 0.14; u.head.rotation.x = 0.18;
  // glowing eyes on the face (+z)
  const eye = box(0.06, 0.06, 0.04, 0xff3020, { emissive: 0xff2200, emissiveIntensity: 2, cast: false });
  eye.position.set(-0.09, 1.68, 0.19); g.add(eye);
  const eye2 = eye.clone(); eye2.position.x = 0.09; g.add(eye2);
  // torn clothes / wound patches
  const wound = box(0.16, 0.12, 0.03, 0x5c1410, { cast: false });
  wound.position.set(0.12, 1.1, 0.18); g.add(wound);
  if (type === 'runner') { const w2 = wound.clone(); w2.position.set(-0.1, 0.9, 0.17); g.add(w2); }
  if (type === 'brute' || type === 'boss') {
    const spike = cyl(0.02, 0.1, 0.3, 0xcfc9b8); spike.position.set(0.2, 1.95, 0); spike.rotation.z = -0.4; g.add(spike);
    const spike2 = spike.clone(); spike2.position.x = -0.2; spike2.rotation.z = 0.4; g.add(spike2);
    u.torso.scale.set(1.35, 1, 1.25);
    const jaw = box(0.26, 0.08, 0.06, 0xe8e0c8, { cast: false }); jaw.position.set(0, 1.54, 0.2); g.add(jaw);
  }
  return g;
}

// ---------------- Environment textures ----------------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function roadTexture() {
  const t = canvasTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#3b3d42'; ctx.fillRect(0, 0, w, h);
    // grime
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(${20 + Math.random() * 40 | 0},${20 + Math.random() * 40 | 0},${22 + Math.random() * 40 | 0},0.35)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 2 + Math.random() * 8);
    }
    // cracks
    ctx.strokeStyle = 'rgba(15,15,18,0.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); let x = Math.random() * w, y = Math.random() * h; ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 60; y += Math.random() * 50; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // dashed center line, faded
    ctx.fillStyle = 'rgba(210,200,140,0.55)';
    for (let y = 0; y < h; y += 84) ctx.fillRect(w / 2 - 5, y, 10, 46);
    // edge lines
    ctx.fillStyle = 'rgba(200,200,200,0.30)';
    ctx.fillRect(10, 0, 6, h); ctx.fillRect(w - 16, 0, 6, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function dirtTexture() {
  const t = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#57503f'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const g = 60 + Math.random() * 46 | 0;
      ctx.fillStyle = `rgba(${g},${g - 12},${g - 30},0.5)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 6, 2 + Math.random() * 5);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// wasteland grass for the open arena
export function grassTexture() {
  const t = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4e5638'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      const g = 70 + Math.random() * 50 | 0;
      ctx.fillStyle = `rgba(${g - 20},${g},${40 + Math.random() * 20 | 0},0.45)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 2 + Math.random() * 4);
    }
    // dirt patches
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = 'rgba(90,78,55,0.4)';
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 14, 4 + Math.random() * 9, Math.random() * 3, 0, 7);
      ctx.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function makeRock(rng) {
  const g = new THREE.Group();
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rng() * 0.7),
    mat(0x6e6a60, { roughness: 1 }));
  r.castShadow = true; r.receiveShadow = true;
  r.position.y = 0.3; r.scale.y = 0.6 + rng() * 0.3;
  r.rotation.set(rng() * 3, rng() * 3, rng() * 3);
  g.add(r);
  return g;
}

export function makeBush(rng) {
  const g = new THREE.Group();
  const colors = [0x435231, 0x51603a, 0x3a4a2c];
  const n = 2 + (rng() * 2 | 0);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rng() * 0.3),
      mat(colors[i % 3], { roughness: 1 }));
    b.castShadow = true;
    b.position.set((rng() - 0.5) * 0.7, 0.3 + rng() * 0.15, (rng() - 0.5) * 0.7);
    b.scale.y = 0.7;
    g.add(b);
  }
  return g;
}

export function makeRuinWall(rng) {
  const g = new THREE.Group();
  const brick = 0x8a6a52;
  const base = box(2.4 + rng() * 1.2, 0.8, 0.35, brick); base.position.y = 0.4; g.add(base);
  const top = box(1.0 + rng() * 0.8, 0.5, 0.35, brick);
  top.position.set((rng() - 0.5) * 0.8, 1.05, 0); g.add(top);
  const fallen = box(0.4, 0.25, 0.3, brick);
  fallen.position.set(1.6 + rng() * 0.4, 0.13, 0.5 + rng() * 0.4); fallen.rotation.y = rng() * 2; g.add(fallen);
  return g;
}

// shared instanced grass tufts (cheap: one draw call per tile)
const TUFT_GEO = new THREE.ConeGeometry(0.1, 0.34, 4);
const TUFT_COLORS = [0x5d6b3a, 0x6a7a42, 0x515f35];
export function makeGrassTufts(rng, tileSize, count = 26) {
  const inst = new THREE.InstancedMesh(TUFT_GEO, mat(TUFT_COLORS[rng() * 3 | 0], { roughness: 1 }), count);
  inst.castShadow = false; inst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set((rng() - 0.5) * tileSize, 0.16, (rng() - 0.5) * tileSize);
    dummy.rotation.y = rng() * 6.28;
    dummy.rotation.z = (rng() - 0.5) * 0.3;
    const s = 0.7 + rng() * 0.9;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

let windowTex = null;
export function buildingWindowTexture() {
  if (windowTex) return windowTex;
  windowTex = canvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6a6f76'; ctx.fillRect(0, 0, w, h);
    for (let y = 12; y < h - 20; y += 34) {
      for (let x = 10; x < w - 20; x += 26) {
        const r = Math.random();
        ctx.fillStyle = r < 0.12 ? '#ffd98a' : (r < 0.4 ? '#171c24' : '#232b36');
        ctx.fillRect(x, y, 16, 22);
        if (Math.random() < 0.18) { // broken window
          ctx.strokeStyle = '#0d1014'; ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x + 16, y + 22); ctx.moveTo(x + 16, y); ctx.lineTo(x, y + 22); ctx.stroke();
        }
      }
    }
  });
  windowTex.wrapS = windowTex.wrapT = THREE.RepeatWrapping;
  return windowTex;
}

// ---------------- Props ----------------
export function makeBuilding(rng) {
  const g = new THREE.Group();
  const w = 6 + rng() * 6, h = 8 + rng() * 16, d = 8 + rng() * 6;
  const base = new THREE.Color().setHSL(0.07 + rng() * 0.05, 0.12 + rng() * 0.1, 0.32 + rng() * 0.18);
  const m = new THREE.MeshStandardMaterial({ color: base, map: buildingWindowTexture(), flatShading: true, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const roof = box(w + 0.6, 0.5, d + 0.6, 0x2c2e33); roof.position.y = h + 0.25; g.add(roof);
  if (rng() < 0.5) { const tank = cyl(0.8, 0.8, 1.4, 0x6b5b45, 8); tank.position.set((rng() - 0.5) * w * 0.5, h + 1.2, 0); g.add(tank); }
  g.userData.width = w;
  return g;
}

export function makeCar(rng) {
  const g = new THREE.Group();
  const colors = [0x8a3030, 0x2f5d8a, 0x77704f, 0x555b60, 0x9a7c33];
  const c = colors[rng() * colors.length | 0];
  const body = box(1.8, 0.55, 4.0, c); body.position.y = 0.55; g.add(body);
  const top = box(1.6, 0.5, 2.0, c); top.position.set(0, 1.05, 0.2); g.add(top);
  const glass = box(1.5, 0.35, 2.1, 0x18222c, { metalness: 0.3, roughness: 0.2 }); glass.position.set(0, 1.02, 0.2); g.add(glass);
  for (const [x, z] of [[-0.95, -1.3], [0.95, -1.3], [-0.95, 1.3], [0.95, 1.3]]) {
    const wh = cyl(0.32, 0.32, 0.24, 0x191b1e, 10); wh.rotation.z = Math.PI / 2; wh.position.set(x, 0.32, z); g.add(wh);
  }
  g.rotation.y = (rng() - 0.5) * 0.9;
  return g;
}

export function makeLamp() {
  const g = new THREE.Group();
  const pole = cyl(0.07, 0.1, 5.4, 0x3a3f45, 8); pole.position.y = 2.7; g.add(pole);
  const arm = box(0.1, 0.1, 1.2, 0x3a3f45); arm.position.set(0, 5.3, -0.5); g.add(arm);
  const head = box(0.3, 0.14, 0.6, 0x22252a); head.position.set(0, 5.2, -1.0); g.add(head);
  return g;
}

export function makeTree(rng) {
  const g = new THREE.Group();
  const trunk = cyl(0.12, 0.22, 1.6, 0x4a3826, 6); trunk.position.y = 0.8; g.add(trunk);
  // dead tree: bare branches
  for (let i = 0; i < 3; i++) {
    const b = cyl(0.03, 0.07, 1.1, 0x4a3826, 5);
    b.position.y = 1.7 + i * 0.2; b.rotation.z = (rng() - 0.5) * 1.8; b.rotation.x = (rng() - 0.5) * 1.2;
    g.add(b);
  }
  return g;
}

export function makeBarricade() {
  const g = new THREE.Group();
  const b1 = box(2.4, 0.5, 0.3, 0xa8622d); b1.position.y = 0.65; b1.rotation.z = 0.05; g.add(b1);
  const b2 = box(2.4, 0.5, 0.3, 0xc9c9c9); b2.position.y = 0.2; g.add(b2);
  const l1 = box(0.16, 1.0, 0.16, 0x5a4632); l1.position.set(-0.9, 0.5, 0); g.add(l1);
  const l2 = l1.clone(); l2.position.x = 0.9; g.add(l2);
  return g;
}

export function makeSpikes(width = 5.5) {
  const g = new THREE.Group();
  const base = box(width, 0.16, 1.5, 0x54432e); base.position.y = 0.08; g.add(base);
  const n = Math.floor(width / 0.55);
  for (let i = 0; i < n; i++) {
    for (let r = 0; r < 2; r++) {
      const s = cyl(0.01, 0.11, 0.85, 0xb9bcc2, 5, { metalness: 0.6, roughness: 0.35 });
      s.position.set(-width / 2 + 0.4 + i * 0.55, 0.55, -0.35 + r * 0.7);
      g.add(s);
    }
  }
  g.userData.halfW = width / 2;
  return g;
}

export function makeBarrel() {
  const g = new THREE.Group();
  const b = cyl(0.5, 0.5, 1.15, 0xb03024, 10, { roughness: 0.6 }); b.position.y = 0.58; g.add(b);
  const ring = cyl(0.53, 0.53, 0.08, 0x7a1f18, 10); ring.position.y = 0.75; g.add(ring);
  const ring2 = ring.clone(); ring2.position.y = 0.35; g.add(ring2);
  const hazard = box(0.55, 0.3, 0.55, 0xf5c542, { emissive: 0x5c4a00, cast: false }); hazard.position.y = 0.58; hazard.scale.set(0.999, 1, 0.999); g.add(hazard);
  return g;
}

export function makeMedkit() {
  const g = new THREE.Group();
  const b = box(0.85, 0.5, 0.65, 0xf2f2f2); b.position.y = 0.3; g.add(b);
  const c1 = box(0.5, 0.14, 0.14, 0xd8352a, { emissive: 0x661410 }); c1.position.set(0, 0.57, 0); g.add(c1);
  const c2 = box(0.14, 0.14, 0.5, 0xd8352a, { emissive: 0x661410 }); c2.position.set(0, 0.57, 0); g.add(c2);
  return g;
}

export function makeAmmoCrate() {
  const g = new THREE.Group();
  const b = box(0.9, 0.6, 0.7, 0x4f6136); b.position.y = 0.35; g.add(b);
  const lid = box(0.98, 0.12, 0.78, 0x3c4a2a); lid.position.y = 0.68; g.add(lid);
  const stripe = box(0.94, 0.1, 0.2, 0xe8c14d, { emissive: 0x4a3a00 }); stripe.position.y = 0.42; g.add(stripe);
  return g;
}

export function makeNuke() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mat(0x2b2f33, { metalness: 0.4, roughness: 0.5 }));
  body.castShadow = true; body.position.y = 0.5; g.add(body);
  const band = cyl(0.45, 0.45, 0.16, 0xf5c542, 10, { emissive: 0x6b5200, emissiveIntensity: 0.8 });
  band.position.y = 0.5; g.add(band);
  const tip = cyl(0.05, 0.16, 0.3, 0xd8352a, 8); tip.position.y = 0.98; g.add(tip);
  return g;
}

export function makeShieldPickup() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 8, 16),
    mat(0x3fa9ff, { emissive: 0x1560a8, emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.4 }));
  ring.castShadow = true; ring.position.y = 0.62; g.add(ring);
  const core = box(0.3, 0.42, 0.1, 0x9fd8ff, { emissive: 0x2a7ec2, emissiveIntensity: 1 });
  core.position.y = 0.62; g.add(core);
  return g;
}

export function makeMagnetPickup() {
  const g = new THREE.Group();
  const l = box(0.2, 0.55, 0.2, 0xd8352a, { emissive: 0x5c130d }); l.position.set(-0.2, 0.6, 0); g.add(l);
  const r = l.clone(); r.position.x = 0.2; g.add(r);
  const top = box(0.6, 0.22, 0.2, 0xd8352a, { emissive: 0x5c130d }); top.position.y = 0.95; g.add(top);
  const tl = box(0.2, 0.16, 0.2, 0xe8e8e8); tl.position.set(-0.2, 0.3, 0); g.add(tl);
  const tr = tl.clone(); tr.position.x = 0.2; g.add(tr);
  return g;
}

export function makeFreezePickup() {
  const g = new THREE.Group();
  const ice = new THREE.Mesh(new THREE.OctahedronGeometry(0.42),
    mat(0x9fe8ff, { emissive: 0x2a8ec2, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.1 }));
  ice.castShadow = true; ice.position.y = 0.65; ice.scale.y = 1.5; g.add(ice);
  return g;
}

export function makeFirePickup() {
  const g = new THREE.Group();
  const base = cyl(0.3, 0.36, 0.25, 0x3a3025, 8); base.position.y = 0.13; g.add(base);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 6),
    mat(0xff6a1f, { emissive: 0xcc3f00, emissiveIntensity: 1.6, roughness: 0.4 }));
  flame.castShadow = true; flame.position.y = 0.65; g.add(flame);
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6),
    mat(0xffd94d, { emissive: 0xd88a00, emissiveIntensity: 2, roughness: 0.3 }));
  inner.position.y = 0.55; g.add(inner);
  return g;
}

export function makeGasPickup() {
  const g = new THREE.Group();
  const tank = cyl(0.3, 0.3, 0.8, 0x3f7a3a, 10, { roughness: 0.5, metalness: 0.3 });
  tank.position.y = 0.45; g.add(tank);
  const band = cyl(0.32, 0.32, 0.12, 0xd6d23e, 10, { emissive: 0x5c5a00, emissiveIntensity: 0.9 });
  band.position.y = 0.55; g.add(band);
  const valve = cyl(0.08, 0.08, 0.18, 0x8a8f95, 8, { metalness: 0.6, roughness: 0.3 });
  valve.position.y = 0.94; g.add(valve);
  const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2),
    mat(0x86e05c, { emissive: 0x3aa021, emissiveIntensity: 1.3, transparent: true, opacity: 0.8 }));
  puff.position.set(0.18, 1.05, 0); g.add(puff);
  return g;
}

export function makeFrostNovaPickup() {
  const g = new THREE.Group();
  for (const [x, z, s, r] of [[0, 0, 1, 0], [0.28, 0.1, 0.6, 0.5], [-0.25, -0.08, 0.5, -0.4]]) {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 * s),
      mat(0xdff4ff, { emissive: 0x3fa8e8, emissiveIntensity: 1.4, roughness: 0.15, metalness: 0.2 }));
    shard.castShadow = true;
    shard.position.set(x, 0.45 * s + 0.15, z);
    shard.scale.y = 2.1; shard.rotation.y = r;
    g.add(shard);
  }
  return g;
}

export function makeGemMesh() {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.2),
    new THREE.MeshStandardMaterial({ color: 0x53e06a, emissive: 0x1d9c33, emissiveIntensity: 1.4, flatShading: true, roughness: 0.3 }));
  m.castShadow = false;
  return m;
}

export function makeShieldRing() {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0x53b8ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.25;
  return ring;
}

// ---------------- Weapon barrel (numbered wooden barrel → firepower up) ----------------
export function drawBarrelLabel(canvas, tex, num, label = 'x2 FIRE') {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.textAlign = 'center';
  ctx.font = 'bold 150px Arial';
  ctx.fillStyle = '#fff4d6';
  ctx.strokeStyle = 'rgba(40,20,0,0.85)'; ctx.lineWidth = 16;
  ctx.strokeText(String(num), 128, 148);
  ctx.fillText(String(num), 128, 148);
  ctx.font = 'bold 52px Arial';
  ctx.lineWidth = 10;
  ctx.fillStyle = '#ffd34d';
  ctx.strokeText(label, 128, 218);
  ctx.fillText(label, 128, 218);
  tex.needsUpdate = true;
}

export function makeWeaponBarrel() {
  const g = new THREE.Group();
  const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.4, 12),
    mat(0x9a6b38, { roughness: 0.9 }));
  wood.castShadow = true; wood.receiveShadow = true;
  wood.rotation.z = Math.PI / 2;
  wood.position.y = 0.95;
  g.add(wood);
  for (const dx of [-0.85, 0, 0.85]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.16, 12),
      mat(0x4e4438, { metalness: 0.5, roughness: 0.5 }));
    ring.castShadow = true;
    ring.rotation.z = Math.PI / 2;
    ring.position.set(dx, 0.95, 0);
    g.add(ring);
  }
  const { canvas, tex } = gateLabelTexture();
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  label.position.set(0, 1.35, 1.05);
  g.add(label);
  g.userData = { canvas, tex };
  return g;
}

export function gateLabelTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { canvas: c, tex: t };
}

export function drawGateLabel(canvas, tex, num, label, good) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.textAlign = 'center';
  ctx.font = 'bold 140px Arial';
  ctx.fillStyle = good ? '#eafff2' : '#ffe9e6';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 14;
  ctx.strokeText(String(num), 128, 140);
  ctx.fillText(String(num), 128, 140);
  ctx.font = 'bold 40px Arial';
  ctx.lineWidth = 8;
  ctx.strokeText(label, 128, 206);
  ctx.fillText(label, 128, 206);
  tex.needsUpdate = true;
}

export function makeGate(width, color) {
  const g = new THREE.Group();
  const post = box(0.28, 3.2, 0.28, 0x5b6167, { metalness: 0.4, roughness: 0.4 });
  post.position.set(-width / 2, 1.6, 0); g.add(post);
  const post2 = post.clone(); post2.position.x = width / 2; g.add(post2);
  const barTop = box(width, 0.22, 0.22, 0x5b6167, { metalness: 0.4, roughness: 0.4 }); barTop.position.y = 3.1; g.add(barTop);
  const panelMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.34, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, 2.9), panelMat);
  panel.position.y = 1.55; g.add(panel);
  const { canvas, tex } = gateLabelTexture();
  const label = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  label.position.set(0, 1.9, 0.06);
  g.add(label);
  g.userData = { canvas, tex, panelMat, halfW: width / 2 };
  return g;
}
