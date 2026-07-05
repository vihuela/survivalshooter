// Dead Rush — open-arena survival (Vampire Survivors-style), low-poly 3D.
import * as THREE from 'three';
import * as M from './models.js';
import * as FX from './fx.js';
import { initAudio, sfx } from './audio.js';
import { t, getLang, setLang, LANG_LIST } from './i18n.js';

// ------------------------------------------------------------------ helpers
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (id) => document.getElementById(id);
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const DBG = new URLSearchParams(location.search);
const GOD_MODE = DBG.get('demo') === '1';
const FREEZE_T = parseFloat(DBG.get('freeze') || '0');
const BOSS_EVERY = parseFloat(DBG.get('bossat') || '120');

// ------------------------------------------------------------------ constants
const TILE = 24;                 // ground tile size
const MAX_ZOMBIES = 50;
const SPAWN_R = 30;              // enemies appear on this ring (offscreen)
const DESPAWN_R = 48;            // beyond this they get teleported back onto the ring
const AIM_RANGE = 22;
const CAM_OFF = new THREE.Vector3(0, 16.5, 10.0);

// ------------------------------------------------------------------ renderer / scene
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;

const scene = new THREE.Scene();
{ // gradient dusk sky
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const ctx2 = c.getContext('2d');
  const g = ctx2.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#26364f'); g.addColorStop(0.55, '#7a89a4'); g.addColorStop(1, '#c9a06a');
  ctx2.fillStyle = g; ctx2.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}
scene.fog = new THREE.Fog(0x8a93a6, 38, 110);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 220);

const hemi = new THREE.HemisphereLight(0xbdd0ea, 0x6e5b43, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffdba4, 3.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
sun.shadow.camera.near = 2; sun.shadow.camera.far = 80;
sun.shadow.bias = -0.0006;
scene.add(sun); scene.add(sun.target);
const muzzleLight = new THREE.PointLight(0xffc060, 0, 9, 2);
scene.add(muzzleLight);
FX.initFx(scene);

// ------------------------------------------------------------------ endless tiled wasteland
const grassTex = M.grassTexture(); grassTex.repeat.set(6, 6);
const tiles = new Map();         // "i,j" -> group
function buildTile(i, j) {
  const g = new THREE.Group();
  const rng = mulberry32(i * 73856093 ^ j * 19349663);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(TILE, TILE),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  g.add(ground);
  // instanced grass tufts — one draw call, big "crafted" feel win
  g.add(M.makeGrassTufts(rng, TILE - 2));
  // scattered decoration (no collision, arena stays readable)
  const n = 2 + (rng() * 3 | 0);
  for (let k = 0; k < n; k++) {
    const r = rng();
    let p;
    if (r < 0.24) p = M.makeTree(rng);
    else if (r < 0.42) p = M.makeRock(rng);
    else if (r < 0.58) p = M.makeBush(rng);
    else if (r < 0.68) { p = M.makeCar(rng); }
    else if (r < 0.76) { p = M.makeLamp(); p.rotation.y = rng() * 6.28; }
    else if (r < 0.86) { p = M.makeRuinWall(rng); p.rotation.y = rng() * 6.28; }
    else if (r < 0.93) { p = M.makeBarricade(); p.rotation.y = rng() * 6.28; }
    else break; // some tiles stay empty
    p.position.set((rng() - 0.5) * (TILE - 4), 0, (rng() - 0.5) * (TILE - 4));
    g.add(p);
  }
  g.position.set(i * TILE, 0, j * TILE);
  scene.add(g);
  return g;
}
function updateTiles() {
  const ti = Math.round(hero.position.x / TILE), tj = Math.round(hero.position.z / TILE);
  for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
    const key = (ti + di) + ',' + (tj + dj);
    if (!tiles.has(key)) tiles.set(key, buildTile(ti + di, tj + dj));
  }
  if (tiles.size > 60) {          // evict tiles far from the hero
    for (const [key, g] of tiles) {
      const [i, j] = key.split(',').map(Number);
      if (Math.abs(i - ti) > 3 || Math.abs(j - tj) > 3) {
        scene.remove(g);
        g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        tiles.delete(key);
      }
    }
  }
}

// ------------------------------------------------------------------ state
const META = JSON.parse(localStorage.getItem('dr_meta') || '{"hp":0,"rate":0,"dmg":0}');
const S = {
  phase: 'title',            // title | run | choose | dead
  time: 0, kills: 0,
  hp: 100 + META.hp * 20, maxHp: 100 + META.hp * 20, invuln: 0,
  fireRate: 4.2 * Math.pow(1.08, META.rate), dmg: 1 + META.dmg * 0.5,
  rapidT: 0, weaponTier: 0,
  xp: 0, xpNeed: 12, heroLv: 1,
  extraStreams: 0, pierce: 0, critC: 0, magnetR: 2.8, speedMul: 1,
  lifesteal: 0, lsCounter: 0, shield: 0, freezeT: 0,
  coins: parseInt(localStorage.getItem('dr_coins') || '0', 10), runCoins: 0,
  pendingChoices: 0, resumePhase: 'run',
  shake: 0, clock: 0,
  spawnAcc: 0, nextSurge: 60, nextBoss: BOSS_EVERY, bossCount: 0,
  pickupT: 6, wBarrelT: 12, oilT: 8,
  best: parseInt(localStorage.getItem('dr_best_t') || '0', 10),
};

// ------------------------------------------------------------------ hero + companions
const hero = M.makeHero();
scene.add(hero);
const heroU = hero.userData;
const shieldRing = M.makeShieldRing();
shieldRing.visible = false;
hero.add(shieldRing);
const companions = [];
function addCompanion() {
  if (companions.length >= 2) return false;
  const tint = companions.length === 0 ? 0x8a6a2f : 0x51606e;
  const c = M.makeHero(tint);
  const off = companions.length === 0 ? new THREE.Vector3(-1.5, 0, 0.6) : new THREE.Vector3(1.5, 0, 0.6);
  c.position.copy(hero.position).add(off);
  scene.add(c);
  companions.push({ obj: c, off, cd: Math.random() * 0.2 });
  M.applyGunTier(c.userData, S.weaponTier);
  return true;
}

// ------------------------------------------------------------------ bullets / weapon tiers
const TIERS = [
  { streams: 1, rateMul: 1.0, dmgBonus: 0, color: 0xffe27a, scale: 1 },
  { streams: 2, rateMul: 1.25, dmgBonus: 0, color: 0xffab4d, scale: 1.15 },
  { streams: 2, rateMul: 1.8, dmgBonus: 1, color: 0x7ad9ff, scale: 1.45 },
];
const bullets = [];
const bulletPool = [];
const bulletGeo = new THREE.BoxGeometry(0.1, 0.1, 0.55);
const bulletMats = TIERS.map(t => new THREE.MeshBasicMaterial({ color: t.color }));
function fireBullet(from, dir, dmg, tier) {
  let m = bulletPool.pop();
  if (!m) { m = new THREE.Mesh(bulletGeo, bulletMats[0]); scene.add(m); }
  m.material = bulletMats[tier];
  m.scale.setScalar(TIERS[tier].scale);
  m.visible = true;
  m.position.copy(from);
  m.lookAt(from.clone().add(dir));
  bullets.push({ m, v: dir.clone().multiplyScalar(46), life: 0.75, dmg, pierce: S.pierce, lastHit: null });
}
function applyTierToAll() {
  M.applyGunTier(heroU, S.weaponTier);
  for (const c of companions) M.applyGunTier(c.obj.userData, S.weaponTier);
}
function tierUp() {
  FX.levelGlowFx(hero.position.x, hero.position.z);
  if (S.weaponTier < 2) {
    S.weaponTier++;
    applyTierToAll();
    toast(S.weaponTier === 1 ? t('tier1') : t('tier2'));
  } else {
    S.dmg += 1;
    toast(t('dmg_up'));
  }
  sfx.gateBreak();
}

// ------------------------------------------------------------------ particles / decals
const particles = [];
const partPool = [];
const partGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
function burst(pos, color, n, speed = 5, life = 0.6, gravity = 12, size = 1) {
  for (let i = 0; i < n; i++) {
    let p = partPool.pop();
    if (!p) {
      p = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
      scene.add(p);
    }
    p.material.color.set(color); p.material.opacity = 1; p.visible = true;
    p.position.copy(pos);
    p.scale.setScalar(size * (0.6 + Math.random() * 0.8));
    particles.push({
      m: p, life, t: 0, g: gravity,
      v: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * 0.9 + 1, (Math.random() - 0.5) * speed),
    });
  }
}
const decals = [];
function scorch(pos, r = 2.6, color = 0x14110d) {
  const d = new THREE.Mesh(new THREE.CircleGeometry(r, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false }));
  d.rotation.x = -Math.PI / 2; d.position.set(pos.x, 0.02, pos.z);
  scene.add(d); decals.push({ m: d, t: 0 });
  if (decals.length > 8) { const old = decals.shift(); scene.remove(old.m); old.m.geometry.dispose(); old.m.material.dispose(); }
}

// ------------------------------------------------------------------ zombies
const zombies = [];
const zPool = { walker: [], runner: [], brute: [], boss: [] };
// Exponential catch-up curve (sim-tuned): flat for the first 75s while the
// player powers up, then ×1.32 every 30s so the horde keeps pace with
// multiplicative player growth.
function hpScale() { return Math.pow(1.32, Math.max(0, S.time - 75) / 30); }
function spawnZombie(type, x, z) {
  if (type !== 'boss' && zombies.length >= MAX_ZOMBIES) return null;
  const def = M.ZOMBIE_TYPES[type];
  let obj = zPool[type].pop();
  if (!obj) {
    obj = M.makeZombie(type);
    scene.add(obj);
    if (type === 'brute' || type === 'boss') {
      const bar = new THREE.Group();
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x1a0d0d, transparent: true, opacity: 0.85, depthWrite: false }));
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xd8352a, depthWrite: false }));
      fill.position.z = 0.01;
      bar.add(bg); bar.add(fill);
      bar.position.y = 2.35;
      obj.add(bar);
      obj.userData.hpBar = bar; obj.userData.hpFill = fill;
    }
  }
  obj.visible = true; obj.rotation.set(0, 0, 0); obj.position.set(x, 0, z);
  if (obj.userData.hpBar) { obj.userData.hpBar.visible = true; obj.userData.hpFill.scale.x = 1; }
  const z2 = {
    obj, type, def,
    hp: Math.round(def.hp * (type === 'boss' ? 1 + S.bossCount * 0.9 : hpScale())),
    speed: def.speed * (0.85 + Math.random() * 0.3) * (1 + S.time / 600),
    phase: Math.random() * Math.PI * 2,
    dead: 0, atkCd: 0, roarT: 3, addT: 0, frozenT: 0, slowT: 0,
  };
  z2.maxHp = z2.hp;
  zombies.push(z2);
  return z2;
}
function spawnOnRing(type, rMin = SPAWN_R, rMax = SPAWN_R + 5) {
  const a = Math.random() * Math.PI * 2;
  const r = rMin + Math.random() * (rMax - rMin);
  return spawnZombie(type, hero.position.x + Math.cos(a) * r, hero.position.z + Math.sin(a) * r);
}
function killZombie(z, silent = false) {
  z.dead = 0.0001;
  S.kills++;
  $('killCount').textContent = S.kills;
  if (!silent) { sfx.zombieDie(); burst(z.obj.position.clone().setY(1), 0x8a1a12, 10, 5, 0.7); }
  dropGem(z.obj.position, z.type === 'boss' ? 30 : z.type === 'brute' ? 6 : 1);
  S.runCoins += z.def.score;
  $('coinCount').textContent = S.runCoins;
  if (S.lifesteal > 0 && ++S.lsCounter >= 10) { S.lsCounter = 0; S.hp = Math.min(S.maxHp, S.hp + S.lifesteal); }
  if (z.type === 'boss') {
    burst(z.obj.position.clone().setY(2), 0x8a1a12, 30, 9, 1.0, 8, 2);
    S.shake = Math.max(S.shake, 0.8);
    S.runCoins += 60;
    tierUp();                          // boss chest: guaranteed weapon upgrade
    for (let i = 0; i < 6; i++) dropGem(z.obj.position, 5);
    bigMsg(t('boss_kill'), 1800);
    sfx.levelClear();
  }
}

// ------------------------------------------------------------------ XP gems + level-up
const gems = [];
const gemPool = [];
function dropGem(pos, value) {
  if (gems.length > 70) { const g0 = gems[0]; g0.value += value; g0.m.scale.setScalar(Math.min(1.8, 1 + g0.value * 0.05)); return; }
  let m = gemPool.pop();
  if (!m) { m = M.makeGemMesh(); scene.add(m); }
  m.visible = true; m.scale.setScalar(1);
  m.position.set(pos.x + (Math.random() - 0.5), 0.35, pos.z + (Math.random() - 0.5));
  gems.push({ m, value, pull: false, t: Math.random() * 6 });
}
function gainXp(v) {
  S.xp += v;
  while (S.xp >= S.xpNeed) {
    S.xp -= S.xpNeed;
    S.heroLv++;
    S.xpNeed = 12 + S.heroLv * 10;
    $('heroLvLabel').textContent = 'LV ' + S.heroLv;
    S.pendingChoices++;
    openUpgrade();
  }
  $('xpFill').style.width = (100 * S.xp / S.xpNeed) + '%';
}

const UPGRADES = [
  { ic: '🔥', k: 'u_rate', ok: () => true, ap: () => S.fireRate *= 1.15 },
  { ic: '💥', k: 'u_dmg', ok: () => true, ap: () => S.dmg += 1 },
  { ic: '🔱', k: 'u_multi', ok: () => S.extraStreams < 2, ap: () => S.extraStreams++ },
  { ic: '🎯', k: 'u_pierce', ok: () => S.pierce < 3, ap: () => S.pierce++ },
  { ic: '⚡', k: 'u_crit', ok: () => S.critC < 0.45, ap: () => S.critC += 0.15 },
  { ic: '❤️', k: 'u_hp', ok: () => true, ap: () => { S.maxHp += 25; S.hp = Math.min(S.maxHp, S.hp + 25); } },
  { ic: '🧲', k: 'u_magnet', ok: () => S.magnetR < 9, ap: () => S.magnetR *= 1.6 },
  { ic: '🪖', k: 'u_ally', ok: () => companions.length < 2, ap: () => addCompanion() },
  { ic: '👟', k: 'u_speed', ok: () => S.speedMul < 1.5, ap: () => S.speedMul += 0.1 },
  { ic: '🩸', k: 'u_vamp', ok: () => S.lifesteal < 6, ap: () => S.lifesteal += 2 },
];
let upgradeChoices = [];
function buildCards() {
  const pool = UPGRADES.filter(u => u.ok());
  upgradeChoices = [];
  while (upgradeChoices.length < 3 && pool.length) {
    upgradeChoices.push(pool.splice(Math.random() * pool.length | 0, 1)[0]);
  }
  upgradeChoices.forEach((u, i) => {
    $('card' + i).innerHTML = `<span class="ic">${u.ic}</span><span><div class="nm">${t(u.k + '_n')}</div><div class="ds">${t(u.k + '_d')}</div></span>`;
    $('card' + i).style.display = 'flex';
  });
  for (let i = upgradeChoices.length; i < 3; i++) $('card' + i).style.display = 'none';
}
function openUpgrade() {
  if (S.phase === 'dead') return;
  if (S.phase === 'choose') return;
  S.resumePhase = S.phase;
  S.phase = 'choose';
  buildCards();
  $('upgrade').style.display = 'flex';
  sfx.pickup();
}
function pickUpgrade(i) {
  const u = upgradeChoices[i];
  if (!u) return;
  u.ap();
  toast(`${u.ic} ${t(u.k + '_n')}!`);
  S.pendingChoices = Math.max(0, S.pendingChoices - 1);
  if (S.pendingChoices > 0) { buildCards(); sfx.pickup(); }
  else { $('upgrade').style.display = 'none'; S.phase = S.resumePhase; }
  updateHUD();
}
for (let i = 0; i < 3; i++) $('card' + i).addEventListener('click', () => pickUpgrade(i));

// ------------------------------------------------------------------ elemental zones (fire / gas)
const zones = [];
const ZONE_DEF = {
  fire: { color: 0xff7a30, dps: 4.5, tick: 0.45, emit: 0.07 },
  gas: { color: 0x7ddb4f, dps: 3, tick: 0.45, emit: 0.13 },
};
function addZone(type, x, z, r, life, follow = false) {
  const def = ZONE_DEF[type];
  const base = new THREE.Mesh(new THREE.CircleGeometry(r, 24),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  base.rotation.x = -Math.PI / 2;
  base.position.set(x, 0.05, z);
  scene.add(base);
  zones.push({ type, def, x, z, r, life, t: 0, tickT: 0, emitT: 0, follow, base });
}
function updateZones(dt) {
  for (let i = zones.length - 1; i >= 0; i--) {
    const zo = zones[i];
    zo.t += dt;
    if (zo.t >= zo.life) { scene.remove(zo.base); zo.base.geometry.dispose(); zo.base.material.dispose(); zones.splice(i, 1); continue; }
    if (zo.follow) { zo.x = hero.position.x; zo.z = hero.position.z; zo.base.position.set(zo.x, 0.05, zo.z); }
    zo.base.material.opacity = 0.14 + 0.08 * Math.sin(zo.t * 6) + 0.06 * Math.min(1, (zo.life - zo.t));
    // particles
    zo.emitT -= dt;
    if (zo.emitT <= 0) {
      zo.emitT = zo.def.emit;
      const a = Math.random() * 6.28, rr = Math.random() * zo.r;
      if (zo.type === 'fire') {
        FX.fx({ tex: FX.TEX.glow, color: Math.random() < 0.5 ? 0xff9840 : 0xff5a1f,
          x: zo.x + Math.sin(a) * rr, y: 0.3, z: zo.z + Math.cos(a) * rr,
          s0: 0.7, s1: 2.2, life: 0.5 + Math.random() * 0.3, vy: 3 + Math.random() * 2 });
      } else {
        FX.fx({ tex: FX.TEX.puff, color: 0x86e05c,
          x: zo.x + Math.sin(a) * rr, y: 0.5, z: zo.z + Math.cos(a) * rr,
          s0: 1.4, s1: 3.6, life: 1.1 + Math.random() * 0.5, vy: 0.8, rot: 0.9, o0: 0.65 });
      }
    }
    // damage ticks
    zo.tickT -= dt;
    if (zo.tickT <= 0) {
      zo.tickT = zo.def.tick;
      for (const zb of zombies) {
        if (zb.dead) continue;
        const dx = zb.obj.position.x - zo.x, dz = zb.obj.position.z - zo.z;
        if (dx * dx + dz * dz < zo.r * zo.r) {
          zb.hp -= zo.def.dps * zo.def.tick * (zb.type === 'boss' ? 0.6 : 1);
          if (zo.type === 'gas') zb.slowT = 0.7;
          if (zb.hp <= 0) killZombie(zb);
        }
      }
    }
  }
}

// ------------------------------------------------------------------ pickups / barrels
const pickups = [];
const PICKUP_MAKERS = {
  med: M.makeMedkit, ammo: M.makeAmmoCrate, nuke: M.makeNuke,
  shield: M.makeShieldPickup, magnet: M.makeMagnetPickup, freeze: M.makeFreezePickup,
  fire: M.makeFirePickup, gas: M.makeGasPickup, nova: M.makeFrostNovaPickup,
};
function randomPickupKind() {
  const r = Math.random();
  if (r < 0.15) return 'med';
  if (r < 0.26) return 'ammo';
  if (r < 0.35) return 'nuke';
  if (r < 0.47) return 'shield';
  if (r < 0.56) return 'magnet';
  if (r < 0.66) return 'freeze';
  if (r < 0.79) return 'fire';
  if (r < 0.90) return 'gas';
  return 'nova';
}
function spawnPickupNear() {
  const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 8;
  const obj = PICKUP_MAKERS[randomPickupKind() === 'med' && S.hp / S.maxHp < 0.5 ? 'med' : randomPickupKind()]();
  // note: kind decided once for behaviour
  const kind = obj.__kind;
  pickupsPush(obj, hero.position.x + Math.cos(a) * r, hero.position.z + Math.sin(a) * r, kind);
}
function pickupsPush(obj, x, z, kind) {
  obj.position.set(x, 0, z);
  scene.add(obj);
  pickups.push({ obj, x, z, kind });
}
function applyPickup(kind) {
  switch (kind) {
    case 'med': S.hp = Math.min(S.maxHp, S.hp + 35); toast(t('p_med')); break;
    case 'ammo': S.rapidT = 8; toast(t('p_ammo')); break;
    case 'nuke': {
      $('flash').classList.remove('show'); void $('flash').offsetWidth; $('flash').classList.add('show');
      sfx.explosion(); S.shake = Math.max(S.shake, 1.2);
      FX.nukeFx(hero.position.x, hero.position.z);
      for (const z of [...zombies]) {
        if (z.dead) continue;
        if (z.type === 'brute' || z.type === 'boss') { z.hp -= 60; if (z.hp <= 0) killZombie(z); }
        else killZombie(z);
      }
      toast(t('p_nuke'));
      break;
    }
    case 'shield': S.shield = 3; shieldRing.material.opacity = 0.75;
      FX.pickupFx(hero.position.x, hero.position.z, 0x53b8ff);
      toast(t('p_shield')); break;
    case 'magnet': gems.forEach(g => g.pull = true);
      FX.pickupFx(hero.position.x, hero.position.z, 0xff6a5e);
      toast(t('p_magnet')); break;
    case 'freeze': S.freezeT = 6;
      FX.pickupFx(hero.position.x, hero.position.z, 0x9fdcff);
      toast(t('p_freeze')); break;
    case 'fire': addZone('fire', hero.position.x, hero.position.z, 4.2, 7, true);
      FX.fireballFx(hero.position.x, hero.position.z, 0.8);
      sfx.explosion();
      toast(t('p_fire')); break;
    case 'gas': {
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * 6.28, r = 3 + Math.random() * 5;
        addZone('gas', hero.position.x + Math.sin(a) * r, hero.position.z + Math.cos(a) * r, 3.5, 9);
      }
      toast(t('p_gas'));
      break;
    }
    case 'nova': {
      FX.frostNovaFx(hero.position.x, hero.position.z);
      sfx.gateBreak(); S.shake = Math.max(S.shake, 0.5);
      for (const z of zombies) {
        if (z.dead) continue;
        const d = z.obj.position.distanceTo(hero.position);
        if (d < 13) {
          z.hp -= 5;
          z.frozenT = 3;
          if (z.hp <= 0) killZombie(z);
        }
      }
      toast(t('p_nova'));
      break;
    }
  }
}

const wBarrels = [];
function spawnWeaponBarrel() {
  const b = M.makeWeaponBarrel();
  const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 8;
  const x = hero.position.x + Math.cos(a) * r, z = hero.position.z + Math.sin(a) * r;
  b.position.set(x, 0, z);
  b.rotation.y = Math.random() * 6.28;
  scene.add(b);
  const hp = Math.round(10 + S.time / 12 + Math.random() * 6);
  const wb = { obj: b, hp };
  M.drawBarrelLabel(b.userData.canvas, b.userData.tex, hp, t("barrel_label"));
  wBarrels.push(wb);
}
function breakWeaponBarrel(wb) {
  const pos = wb.obj.position.clone();
  scene.remove(wb.obj);
  wBarrels.splice(wBarrels.indexOf(wb), 1);
  burst(pos.setY(1), 0x9a6b38, 20, 8, 0.9, 10, 1.6);
  burst(pos, 0xffd34d, 12, 6, 0.6, 6, 1);
  S.shake = Math.max(S.shake, 0.35);
  tierUp();
}

const barrels = [];
function spawnOilBarrels() {
  const a = Math.random() * Math.PI * 2, r = 11 + Math.random() * 9;
  const bx = hero.position.x + Math.cos(a) * r, bz = hero.position.z + Math.sin(a) * r;
  const n = 2 + (Math.random() * 2 | 0);
  for (let i = 0; i < n; i++) {
    const b = M.makeBarrel();
    b.position.set(bx + (Math.random() - 0.5) * 3, 0, bz + (Math.random() - 0.5) * 3);
    b.rotation.y = Math.random() * 6;
    scene.add(b);
    barrels.push({ obj: b, hp: 3 });
  }
}
function explodeBarrel(b) {
  const pos = b.obj.position.clone();
  scene.remove(b.obj);
  barrels.splice(barrels.indexOf(b), 1);
  sfx.explosion(); S.shake = Math.max(S.shake, 0.7);
  FX.fireballFx(pos.x, pos.z, 1);
  addZone('fire', pos.x, pos.z, 2.4, 3);          // lingering burn patch
  burst(pos.clone().setY(0.8), 0x33302c, 12, 7, 1.1, 4, 1.9);
  scorch(pos);
  for (const z of zombies) if (!z.dead && z.obj.position.distanceTo(pos) < 5.6) { z.hp -= 30; if (z.hp <= 0) killZombie(z); }
  for (const b2 of [...barrels]) if (b2.obj.position.distanceTo(pos) < 4.5) explodeBarrel(b2);
  if (hero.position.distanceTo(pos) < 4.2) hurtHero(12);
}

// ------------------------------------------------------------------ spawn director (time-based)
function spawnRate(t) { return 1.3 + t * 0.032; }        // per second
function pickType(t) {
  const r = Math.random();
  if (t > 140 && r < Math.min(0.14, 0.05 + t / 3000)) return 'brute';
  if (t > 20 && r < Math.min(0.45, 0.2 + t / 800)) return 'runner';
  return 'walker';
}
function directorStep(dt) {
  const t = S.time;
  S.spawnAcc += dt * spawnRate(t);
  while (S.spawnAcc >= 1) { S.spawnAcc -= 1; spawnOnRing(pickType(t)); }
  // surge waves
  if (t >= S.nextSurge) {
    S.nextSurge += 45;
    const kind = Math.random() < 0.5 ? 'ring' : 'pack';
    if (kind === 'ring') {
      bigMsg(t('surge_ring'), 1600);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        spawnZombie('walker', hero.position.x + Math.cos(a) * SPAWN_R, hero.position.z + Math.sin(a) * SPAWN_R);
      }
    } else {
      bigMsg(t('surge_pack'), 1600);
      const a = Math.random() * Math.PI * 2;
      for (let i = 0; i < 8; i++) {
        spawnZombie('runner',
          hero.position.x + Math.cos(a) * SPAWN_R + (Math.random() - 0.5) * 6,
          hero.position.z + Math.sin(a) * SPAWN_R + (Math.random() - 0.5) * 6);
      }
    }
    sfx.bossRoar();
  }
  // bosses
  if (t >= S.nextBoss) {
    S.nextBoss += BOSS_EVERY;
    S.bossCount++;
    spawnOnRing('boss', SPAWN_R - 6, SPAWN_R - 2);
    bigMsg(t('boss_come'), 2200);
    sfx.bossRoar();
    S.shake = Math.max(S.shake, 0.5);
  }
  // supplies
  S.pickupT -= dt;
  if (S.pickupT <= 0) { S.pickupT = 8 + Math.random() * 5; const k = randomPickupKind(); pickupsPush(PICKUP_MAKERS[k](), hero.position.x + (Math.random() - 0.5) * 26, hero.position.z + (Math.random() - 0.5) * 26, k); }
  S.wBarrelT -= dt;
  if (S.wBarrelT <= 0) { S.wBarrelT = 32 + Math.random() * 12; spawnWeaponBarrel(); }
  S.oilT -= dt;
  if (S.oilT <= 0) { S.oilT = 14 + Math.random() * 8; spawnOilBarrels(); }
}

// ------------------------------------------------------------------ input: floating joystick
let joyActive = false, joyAX = 0, joyAY = 0, moveX = 0, moveZ = 0;
function isUiTarget(e) {
  return e.target && e.target.closest && e.target.closest('button, a, .panel, #upgrade, #pause, .shopCard, #pauseBtn, #langBox');
}
function pointerDown(x, y) { joyActive = true; joyAX = x; joyAY = y; initAudio(); }
function pointerMove(x, y) {
  if (!joyActive) return;
  const dx = x - joyAX, dy = y - joyAY;
  const len = Math.hypot(dx, dy);
  const dead = 8, full = 56;
  if (len < dead) { moveX = 0; moveZ = 0; return; }
  const k = Math.min(1, (len - dead) / full);
  moveX = dx / len * k;
  moveZ = dy / len * k;
}
function pointerUp() { joyActive = false; moveX = 0; moveZ = 0; }
window.addEventListener('pointerdown', (e) => { if (!isUiTarget(e)) pointerDown(e.clientX, e.clientY); });
window.addEventListener('pointermove', (e) => pointerMove(e.clientX, e.clientY));
window.addEventListener('pointerup', pointerUp);
window.addEventListener('touchstart', (e) => { if (!isUiTarget(e)) { const t = e.touches[0]; pointerDown(t.clientX, t.clientY); } }, { passive: true });
window.addEventListener('touchmove', (e) => { const t = e.touches[0]; pointerMove(t.clientX, t.clientY); }, { passive: true });
window.addEventListener('touchend', pointerUp, { passive: true });
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// ------------------------------------------------------------------ UI
function toast(txt) {
  const t = $('toast');
  t.textContent = txt;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
}
function bigMsg(txt, ms = 1600) {
  const m = $('msg');
  m.textContent = txt;
  m.classList.remove('show'); void m.offsetWidth; m.classList.add('show');
  if (ms) setTimeout(() => m.classList.remove('show'), ms);
}
function vignette() {
  const v = $('vignette');
  v.classList.remove('show'); void v.offsetWidth; v.classList.add('show');
}
function updateHUD() {
  $('hpFill').style.width = (100 * S.hp / S.maxHp) + '%';
  $('hpFill').style.background = S.hp / S.maxHp > 0.4 ? 'linear-gradient(#7ded5c,#3fae2a)' : 'linear-gradient(#f0705c,#c0281e)';
  $('timeLabel').textContent = '⏱ ' + fmtTime(S.time);
}
function saveCoins() {
  S.coins += S.runCoins;
  S.runCoins = 0;
  localStorage.setItem('dr_coins', String(S.coins));
}
function hurtHero(dmg) {
  if (GOD_MODE) return;
  if (S.invuln > 0 || S.phase === 'dead') return;
  if (S.shield > 0) {
    S.shield--;
    S.invuln = 0.5;
    shieldRing.material.opacity = 0.25 + S.shield * 0.17;
    sfx.gateHit();
    burst(hero.position.clone().setY(1), 0x53b8ff, 10, 5, 0.5, 6, 0.9);
    return;
  }
  S.hp -= dmg;
  S.invuln = 0.75;
  S.shake = Math.max(S.shake, 0.4);
  vignette(); sfx.hurt();
  updateHUD();
  if (S.hp <= 0) { S.hp = 0; gameOver(); }
}
// ------------------------------------------------------------------ pause
function openPause() {
  if (S.phase !== 'run') return;
  S.phase = 'paused';
  pointerUp();
  $('pause').style.display = 'flex';
}
function closePause() {
  if (S.phase !== 'paused') return;
  S.phase = 'run';
  last = performance.now();          // don't accumulate dt while paused
  $('pause').style.display = 'none';
}
$('pauseBtn').addEventListener('click', openPause);
$('resumeBtn').addEventListener('click', closePause);
$('pauseHomeBtn').addEventListener('click', () => window.goHome());
$('pauseRetryBtn').addEventListener('click', () => {
  const u = new URL(location.href);
  u.searchParams.set('autostart', '1');
  location.href = u.toString();
});

function gameOver() {
  S.phase = 'dead';
  window.__screen = 'over';
  $('pauseBtn').style.display = 'none';
  sfx.gameOver();
  const survived = Math.floor(S.time);
  if (survived > S.best) { S.best = survived; localStorage.setItem('dr_best_t', String(S.best)); }
  const earned = S.runCoins;
  saveCoins();
  setTimeout(() => {
    $('overStats').innerHTML = t('over_stats', fmtTime(survived), S.heroLv, S.kills, earned, fmtTime(S.best));
    $('over').style.display = 'flex';
  }, 1200);
}

// ------------------------------------------------------------------ shooting (auto-aim nearest, 360°)
const _from = new THREE.Vector3(), _dir = new THREE.Vector3(), _side = new THREE.Vector3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
function nearestZombie(from, maxDist) {
  let best = null, bd = maxDist * maxDist;
  for (const z of zombies) {
    if (z.dead) continue;
    const dx = z.obj.position.x - from.x, dz = z.obj.position.z - from.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bd) { bd = d2; best = z; }
  }
  return best;
}
let heroFireCd = 0;
let lastAimT = -10;
function shootFrom(obj, u, dmg) {
  const target = nearestZombie(obj.position, AIM_RANGE);
  if (!target) return false;
  const tp = target.obj.position;
  // model front is +z, so this points the gun straight at the target
  obj.rotation.y = Math.atan2(tp.x - obj.position.x, tp.z - obj.position.z);
  lastAimT = S.clock;
  _from.copy(u.muzzleOffset).applyAxisAngle(Y_AXIS, obj.rotation.y).add(obj.position);
  _dir.set(tp.x, 1.15, tp.z).sub(_from).normalize();
  const tier = S.weaponTier, td = TIERS[tier];
  const n = Math.min(4, td.streams + S.extraStreams);
  for (let i = 0; i < n; i++) {
    _side.set(-_dir.z, 0, _dir.x).multiplyScalar((i - (n - 1) / 2) * 0.3);
    fireBullet(_from.clone().add(_side), _dir, dmg + td.dmgBonus, tier);
  }
  u.flash.forEach(f => { f.visible = true; setTimeout(() => f.visible = false, 45); });
  return true;
}

// ------------------------------------------------------------------ main loop
let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const frozen = FREEZE_T > 0 && S.clock >= FREEZE_T;
  if (!frozen) S.clock += dt;
  const playing = !frozen && S.phase === 'run';
  const t = S.clock;

  if (playing) {
    S.time += dt;
    // movement (joystick or WASD)
    let mx = moveX, mz = moveZ;
    if (keys['a'] || keys['arrowleft']) mx = -1;
    if (keys['d'] || keys['arrowright']) mx = 1;
    if (keys['w'] || keys['arrowup']) mz = -1;
    if (keys['s'] || keys['arrowdown']) mz = 1;
    const mlen = Math.hypot(mx, mz);
    if (mlen > 1) { mx /= mlen; mz /= mlen; }
    const spd = 5.4 * S.speedMul;
    hero.position.x += mx * spd * dt;
    hero.position.z += mz * spd * dt;
    const moving = mlen > 0.05;
    // face movement direction when we haven't fired at anything recently
    if (moving && S.clock - lastAimT > 0.35) hero.rotation.y = Math.atan2(mx, mz);
    const runAmp = moving ? 0.7 : 0.12;
    heroU.lLeg.rotation.x = Math.sin(t * 11) * runAmp;
    heroU.rLeg.rotation.x = -Math.sin(t * 11) * runAmp;
    hero.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.06 : 0;

    // timers
    if (S.rapidT > 0) S.rapidT -= dt;
    if (S.freezeT > 0) S.freezeT -= dt;
    if (S.invuln > 0) S.invuln -= dt;
    shieldRing.visible = S.shield > 0;
    if (shieldRing.visible) shieldRing.rotation.z += dt * 2;

    // shooting
    heroFireCd -= dt;
    const rate = S.fireRate * TIERS[S.weaponTier].rateMul * (S.rapidT > 0 ? 2 : 1);
    if (heroFireCd <= 0) {
      heroFireCd = 1 / rate;
      if (shootFrom(hero, heroU, S.dmg)) {
        sfx.shoot();
        muzzleLight.position.copy(hero.position).setY(1.4);
        muzzleLight.intensity = 26;
      }
    }
    for (const c of companions) {
      c.cd -= dt;
      c.obj.position.x += ((hero.position.x + c.off.x) - c.obj.position.x) * Math.min(1, dt * 9);
      c.obj.position.z += ((hero.position.z + c.off.z) - c.obj.position.z) * Math.min(1, dt * 9);
      const cu = c.obj.userData;
      cu.lLeg.rotation.x = Math.sin(t * 11 + 1) * runAmp;
      cu.rLeg.rotation.x = -Math.sin(t * 11 + 1) * runAmp;
      if (c.cd <= 0) { c.cd = 1 / (rate * 0.8); shootFrom(c.obj, cu, S.dmg); }
    }
    muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 300);

    directorStep(dt);

    // bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      b.m.position.addScaledVector(b.v, dt);
      let hit = b.life <= 0;
      if (!hit) {
        for (const wb of wBarrels) {
          const dx = b.m.position.x - wb.obj.position.x, dz = b.m.position.z - wb.obj.position.z;
          if (dx * dx + dz * dz < 1.6 && b.m.position.y < 2.2) {
            wb.hp -= 1; hit = true; sfx.gateHit();
            burst(b.m.position.clone(), 0xc9995a, 3, 3, 0.3, 8, 0.7);
            if (wb.hp <= 0) breakWeaponBarrel(wb);
            else M.drawBarrelLabel(wb.obj.userData.canvas, wb.obj.userData.tex, wb.hp, t("barrel_label"));
            break;
          }
        }
        if (!hit) for (const br of barrels) {
          const dx = b.m.position.x - br.obj.position.x, dz = b.m.position.z - br.obj.position.z;
          if (dx * dx + dz * dz < 0.9 && b.m.position.y < 1.7) {
            br.hp -= 1; hit = true;
            burst(b.m.position.clone(), 0xffd080, 3, 3, 0.25, 8, 0.6);
            if (br.hp <= 0) explodeBarrel(br);
            break;
          }
        }
        if (!hit) for (const z of zombies) {
          if (z.dead || z === b.lastHit) continue;
          const r = z.type === 'boss' ? 1.7 : z.type === 'brute' ? 1.1 : 0.72;
          const p = z.obj.position;
          const dx = b.m.position.x - p.x, dz = b.m.position.z - p.z;
          if (dx * dx + dz * dz < r * r && b.m.position.y < 2.4 * z.def.scale) {
            const crit = Math.random() < S.critC;
            z.hp -= b.dmg * (crit ? 3 : 1);
            sfx.hit();
            if (crit) FX.critFx(b.m.position.x, b.m.position.y + 0.3, b.m.position.z);
            burst(b.m.position.clone(), crit ? 0xffc23d : 0x9c1f14, crit ? 8 : 4, crit ? 6 : 3.5, 0.4, 10, crit ? 1.2 : 0.8);
            if (z.hp <= 0) killZombie(z);
            if (b.pierce > 0) { b.pierce--; b.lastHit = z; }
            else hit = true;
            break;
          }
        }
      }
      if (hit) { b.m.visible = false; bulletPool.push(b.m); bullets.splice(i, 1); }
    }

    // zombies
    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i];
      const o = z.obj;
      if (z.dead) {
        z.dead += dt;
        if (o.userData.hpBar) o.userData.hpBar.visible = false;
        o.rotation.x = Math.min(Math.PI / 2, z.dead * 5);
        if (z.dead > 0.55) o.position.y -= dt * 1.6;
        if (z.dead > 1.1) { o.visible = false; zPool[z.type].push(o); zombies.splice(i, 1); }
        continue;
      }
      const dx = hero.position.x - o.position.x, dz = hero.position.z - o.position.z;
      const d = Math.hypot(dx, dz);
      // too far → teleport back onto the spawn ring (keeps pressure while kiting)
      if (d > DESPAWN_R && z.type !== 'boss') {
        const a = Math.random() * Math.PI * 2;
        o.position.set(hero.position.x + Math.cos(a) * SPAWN_R, 0, hero.position.z + Math.sin(a) * SPAWN_R);
        continue;
      }
      let sp = z.speed * (S.freezeT > 0 ? 0.4 : 1);
      if (z.frozenT > 0) { z.frozenT -= dt; sp = 0; }
      else if (z.slowT > 0) { z.slowT -= dt; sp *= 0.55; }
      if (z.type === 'boss') {
        z.roarT -= dt;
        if (z.roarT <= 0) { z.roarT = 7; z.roarBoost = 1.6; sfx.bossRoar(); S.shake = Math.max(S.shake, 0.35); }
        if (z.roarBoost > 0) { sp *= 2.4; z.roarBoost -= dt; }
        $('bossFill').style.width = (100 * Math.max(0, z.hp) / z.maxHp) + '%';
      }
      if (d > 0.05) {
        o.position.x += dx / d * sp * dt;
        o.position.z += dz / d * sp * dt;
        o.rotation.y = Math.atan2(dx, dz);
      }
      // cheap separation so the horde doesn't stack into one blob
      if ((i & 1) === (frameParity & 1)) {
        for (let j = i - 1; j >= 0; j--) {
          const z2 = zombies[j];
          if (z2.dead) continue;
          const sx = o.position.x - z2.obj.position.x, sz = o.position.z - z2.obj.position.z;
          const sd2 = sx * sx + sz * sz;
          if (sd2 > 0.0001 && sd2 < 0.81) {
            const sd = Math.sqrt(sd2), push = (0.9 - sd) * 0.5;
            o.position.x += sx / sd * push; o.position.z += sz / sd * push;
            z2.obj.position.x -= sx / sd * push; z2.obj.position.z -= sz / sd * push;
            break;
          }
        }
      }
      const u = o.userData;
      u.lLeg.rotation.x = Math.sin(t * 6 + z.phase) * 0.55;
      u.rLeg.rotation.x = -Math.sin(t * 6 + z.phase) * 0.55;
      u.lArm.rotation.x = -Math.PI / 2 + Math.sin(t * 4 + z.phase) * 0.15;
      u.rArm.rotation.x = -Math.PI / 2 - Math.sin(t * 4 + z.phase) * 0.15;
      o.position.y = Math.abs(Math.sin(t * 6 + z.phase)) * 0.05;
      if (u.hpBar) {
        const frac = clamp(z.hp / z.maxHp, 0, 1);
        u.hpFill.scale.x = Math.max(0.001, frac);
        u.hpFill.position.x = -0.72 * (1 - frac);
        u.hpBar.quaternion.copy(o.quaternion).invert().multiply(camera.quaternion);
      }
      if (Math.random() < dt * 0.06) sfx.growl();
      const reach = (z.type === 'boss' ? 2.4 : z.type === 'brute' ? 1.5 : 0.95);
      if (d < reach) {
        if (z.type === 'brute' || z.type === 'boss') {
          z.atkCd -= dt;
          if (z.atkCd <= 0) { z.atkCd = 0.9; hurtHero(z.def.dmg); }
        } else {
          hurtHero(z.def.dmg);
          killZombie(z, true);
          burst(o.position.clone().setY(1), 0x8a1a12, 8, 5, 0.6);
        }
      }
    }
    // boss bar visibility
    const bossAlive = zombies.some(z => z.type === 'boss' && !z.dead);
    $('bossBar').style.display = bossAlive ? 'block' : 'none';

    // pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.obj.rotation.y += dt * 2;
      p.obj.position.y = 0.15 + Math.sin(t * 3 + i) * 0.12;
      const dx = hero.position.x - p.obj.position.x, dz = hero.position.z - p.obj.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > DESPAWN_R * DESPAWN_R) { scene.remove(p.obj); pickups.splice(i, 1); continue; }
      if (d2 < 1.4) {
        sfx.pickup();
        applyPickup(p.kind);
        updateHUD();
        burst(p.obj.position.clone().setY(0.8), 0xffffff, 10, 4, 0.5, 6, 0.8);
        scene.remove(p.obj); pickups.splice(i, 1);
      }
    }
    // barrels cleanup when far
    for (let i = wBarrels.length - 1; i >= 0; i--) {
      if (wBarrels[i].obj.position.distanceTo(hero.position) > DESPAWN_R + 10) { scene.remove(wBarrels[i].obj); wBarrels.splice(i, 1); }
    }
    for (let i = barrels.length - 1; i >= 0; i--) {
      if (barrels[i].obj.position.distanceTo(hero.position) > DESPAWN_R + 10) { scene.remove(barrels[i].obj); barrels.splice(i, 1); }
    }

    // xp gems
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      g.t += dt;
      g.m.rotation.y += dt * 3;
      g.m.position.y = 0.35 + Math.sin(g.t * 4) * 0.1;
      const gdx = hero.position.x - g.m.position.x, gdz = hero.position.z - g.m.position.z;
      const d2 = gdx * gdx + gdz * gdz;
      if (g.pull || d2 < S.magnetR * S.magnetR) {
        g.pull = true;
        const d = Math.sqrt(d2) || 1;
        g.m.position.x += gdx / d * 15 * dt;
        g.m.position.z += gdz / d * 15 * dt;
        if (d < 0.9) {
          gainXp(g.value); sfx.gateHit();
          g.m.visible = false; gemPool.push(g.m); gems.splice(i, 1);
        }
      } else if (d2 > DESPAWN_R * DESPAWN_R * 1.4) {
        g.m.visible = false; gemPool.push(g.m); gems.splice(i, 1);
      }
    }

    updateZones(dt);
    updateTiles();
    updateHUD();
  }

  FX.updateFx(dt);
  if (S.phase === 'dead') {
    hero.rotation.x = Math.max(-Math.PI / 2, hero.rotation.x - dt * 4);
  }

  // particles / decals
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    if (p.t >= p.life) { p.m.visible = false; partPool.push(p.m); particles.splice(i, 1); continue; }
    p.v.y -= p.g * dt;
    p.m.position.addScaledVector(p.v, dt);
    if (p.m.position.y < 0.05) { p.m.position.y = 0.05; p.v.y = 0; p.v.x *= 0.9; p.v.z *= 0.9; }
    p.m.material.opacity = 1 - p.t / p.life;
  }
  for (let i = decals.length - 1; i >= 0; i--) {
    const d = decals[i];
    d.t += dt;
    if (d.t > 7) { d.m.material.opacity = Math.max(0, 0.75 - (d.t - 7)); }
    if (d.t > 8) { scene.remove(d.m); d.m.geometry.dispose(); d.m.material.dispose(); decals.splice(i, 1); }
  }

  // camera + sun follow
  S.shake = Math.max(0, S.shake - dt * 1.8);
  const sh = S.shake * S.shake;
  if (S.phase === 'title') {
    // slow cinematic orbit around the hero on the home screen
    const a = S.clock * 0.12;
    camera.position.set(hero.position.x + Math.sin(a) * 8.5, 4.6, hero.position.z + Math.cos(a) * 8.5);
    camera.lookAt(hero.position.x, 1.3, hero.position.z);
  } else {
    camera.position.set(
      hero.position.x + CAM_OFF.x + (Math.random() - 0.5) * sh,
      CAM_OFF.y + (Math.random() - 0.5) * sh * 0.7,
      hero.position.z + CAM_OFF.z
    );
    camera.lookAt(hero.position.x, 0.8, hero.position.z - 2.0);
  }
  sun.position.set(hero.position.x + 13, 21, hero.position.z + 9);
  sun.target.position.set(hero.position.x, 0, hero.position.z);
  sun.target.updateMatrixWorld();

  frameParity++;
  renderer.render(scene, camera);
}
let frameParity = 0;

// ------------------------------------------------------------------ boot / resize
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function startGame() {
  $('title').style.display = 'none';
  $('hud').style.display = 'block';
  $('pauseBtn').style.display = 'block';
  S.maxHp = 100 + META.hp * 20;
  S.hp = S.maxHp;
  S.fireRate = 4.2 * Math.pow(1.08, META.rate);
  S.dmg = 1 + META.dmg * 0.5;
  S.phase = 'run';
  window.__screen = 'game';
  $('heroLvLabel').textContent = 'LV 1';
  initAudio();
  bigMsg(t('survive'), 1600);
}
$('startBtn').addEventListener('click', startGame);
$('retryBtn').addEventListener('click', () => {
  const u = new URL(location.href);
  u.searchParams.set('autostart', '1');
  location.href = u.toString();
});

window.__screen = 'title';
window.goHome = () => {
  saveCoins();
  const u = new URL(location.href);
  u.searchParams.delete('autostart');
  location.href = u.toString();
};
window.handleBack = () => {
  if (window.__screen === 'title') return 'exit';
  if (S.phase === 'run') { openPause(); return 'handled'; }   // back in-game → pause menu
  window.goHome();
  return 'handled';
};
$('homeBtn').addEventListener('click', window.goHome);
$('bestLabel').textContent = S.best > 0 ? t('best', fmtTime(S.best)) : '';

// ------------------------------------------------------------------ i18n
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
}
// collapsed language entry: 🌐 pill expands into a dropdown
function buildLangUI() {
  const cur = LANG_LIST.find(l => l.code === getLang()) || LANG_LIST[2];
  $('langBtn').textContent = `🌐 ${cur.label} ▾`;
  const menu = $('langMenu');
  menu.innerHTML = '';
  for (const l of LANG_LIST) {
    const b = document.createElement('button');
    b.className = 'langPill' + (getLang() === l.code ? ' on' : '');
    b.textContent = l.label;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (getLang() !== l.code) {
        setLang(l.code);
        location.reload();        // title screen only — instant and stateless
        return;
      }
      menu.classList.remove('open');
    });
    menu.appendChild(b);
  }
  $('langBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest || !e.target.closest('#langBox')) menu.classList.remove('open');
  });
}
applyI18n();
buildLangUI();

// ------------------------------------------------------------------ legal links (open in system browser)
const LEGAL = {
  terms: 'https://puzzle-game-legal.pages.dev/terms',
  privacy: 'https://puzzle-game-legal.pages.dev/privacy',
};
function openExternal(url) {
  if (window.AndroidBridge && window.AndroidBridge.openUrl) window.AndroidBridge.openUrl(url);
  else window.open(url, '_blank');
}
$('termsLink').addEventListener('click', () => openExternal(LEGAL.terms));
$('privacyLink').addEventListener('click', () => openExternal(LEGAL.privacy));

// ------------------------------------------------------------------ meta shop (home screen)
const SHOP_ITEMS = [
  { k: 'hp', ic: '❤️', tk: 'shop_hp', max: 5, cost: r => 150 * (r + 1) },
  { k: 'rate', ic: '🔥', tk: 'shop_rate', max: 5, cost: r => 200 * (r + 1) },
  { k: 'dmg', ic: '💥', tk: 'shop_dmg', max: 5, cost: r => 250 * (r + 1) },
];
function renderShop() {
  $('coinsHome').textContent = '🪙 ' + S.coins;
  $('shop').innerHTML = '';
  for (const it of SHOP_ITEMS) {
    const rank = META[it.k];
    const card = document.createElement('div');
    card.className = 'shopCard';
    const pips = '●'.repeat(rank) + '○'.repeat(it.max - rank);
    const maxed = rank >= it.max;
    const cost = maxed ? 0 : it.cost(rank);
    card.innerHTML = `<div class="si">${it.ic}</div><div class="snm">${t(it.tk + '_n')}</div>` +
      `<div class="pips">${pips}</div><small>${t(it.tk + '_d')}</small>`;
    const btn = document.createElement('button');
    btn.className = 'buy';
    btn.textContent = maxed ? t('max') : '🪙' + cost;
    btn.disabled = maxed || S.coins < cost;
    btn.addEventListener('click', () => {
      if (maxed || S.coins < cost) return;
      S.coins -= cost;
      META[it.k]++;
      localStorage.setItem('dr_coins', String(S.coins));
      localStorage.setItem('dr_meta', JSON.stringify(META));
      sfx.pickup();
      renderShop();
    });
    card.appendChild(btn);
    $('shop').appendChild(card);
  }
}
renderShop();

// initial scene dressing + debug hooks
if (new URLSearchParams(location.search).get('autostart')) startGame();
if (DBG.get('tier')) { S.weaponTier = clamp(parseInt(DBG.get('tier'), 10) || 0, 0, 2); applyTierToAll(); }
if (DBG.get('wb')) spawnWeaponBarrel();
if (DBG.get('xp')) setTimeout(() => gainXp(parseInt(DBG.get('xp'), 10) || 0), 400);
updateTiles();
for (let i = 0; i < 14; i++) spawnOnRing('walker', 12, 22);
spawnOilBarrels();

requestAnimationFrame(tick);
