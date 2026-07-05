// GPU-cheap juicy FX: additive glow sprites, shockwave rings, elemental zones.
// All textures are procedural canvases; sprites/rings are pooled.
import * as THREE from 'three';

function makeTex(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function radial(ctx, stops) {
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
}

export const TEX = {};
export function initFxTextures() {
  TEX.glow = makeTex(ctx => radial(ctx, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]));
  TEX.ring = makeTex(ctx => {
    const g = ctx.createRadialGradient(64, 64, 38, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  });
  TEX.puff = makeTex(ctx => {   // fuzzy cloud blob
    for (let i = 0; i < 9; i++) {
      const x = 40 + Math.random() * 48, y = 40 + Math.random() * 48, r = 18 + Math.random() * 22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.32)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  });
  TEX.flake = makeTex(ctx => {  // 6-arm snowflake
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.translate(64, 64);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -46); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(10, -38); ctx.moveTo(0, -28); ctx.lineTo(-10, -38); ctx.stroke();
    }
  });
  TEX.star = makeTex(ctx => {   // 4-point crit starburst
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.translate(64, 64);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 60 : 10;
      const a = i / 8 * Math.PI * 2;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.sin(a) * r, -Math.cos(a) * r);
    }
    ctx.closePath(); ctx.fill();
  });
}

let sceneRef = null;
const sprites = [], spritePool = [];
const rings = [], ringPool = [];

export function initFx(scene) {
  sceneRef = scene;
  initFxTextures();
}

// billboard glow/flame/puff/flake/star
export function fx(opts) {
  const { tex, color = 0xffffff, x, y = 1, z, s0 = 1, s1 = 3, life = 0.5,
    vy = 0, vx = 0, vz = 0, o0 = 1, rot = 0 } = opts;
  let s = spritePool.pop();
  if (!s) {
    s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEX.glow, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, rotation: 0,
    }));
    sceneRef.add(s);
  }
  s.material.map = tex || TEX.glow;
  s.material.color.set(color);
  s.material.opacity = o0;
  s.material.rotation = Math.random() * 6.28;
  s.position.set(x, y, z);
  s.scale.setScalar(s0);
  s.visible = true;
  sprites.push({ s, t: 0, life, s0, s1, vy, vx, vz, o0, rot });
}

// flat expanding shockwave ring on the ground
export function shockwave(x, z, color = 0xffffff, s1 = 10, life = 0.5, s0 = 1) {
  let r = ringPool.pop();
  if (!r) {
    r = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: TEX.ring, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    r.rotation.x = -Math.PI / 2;
    sceneRef.add(r);
  }
  r.material.color.set(color);
  r.material.opacity = 1;
  r.position.set(x, 0.06, z);
  r.scale.setScalar(s0);
  r.visible = true;
  rings.push({ r, t: 0, life, s0, s1 });
}

export function updateFx(dt) {
  for (let i = sprites.length - 1; i >= 0; i--) {
    const p = sprites[i];
    p.t += dt;
    if (p.t >= p.life) { p.s.visible = false; spritePool.push(p.s); sprites.splice(i, 1); continue; }
    const k = p.t / p.life;
    p.s.scale.setScalar(p.s0 + (p.s1 - p.s0) * k);
    p.s.material.opacity = p.o0 * (1 - k);
    p.s.material.rotation += p.rot * dt;
    p.s.position.x += p.vx * dt;
    p.s.position.y += p.vy * dt;
    p.s.position.z += p.vz * dt;
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const p = rings[i];
    p.t += dt;
    if (p.t >= p.life) { p.r.visible = false; ringPool.push(p.r); rings.splice(i, 1); continue; }
    const k = p.t / p.life;
    p.r.scale.setScalar(p.s0 + (p.s1 - p.s0) * (1 - Math.pow(1 - k, 2)));  // ease-out
    p.r.material.opacity = 1 - k;
  }
}

// convenience composites --------------------------------------------------
export function fireballFx(x, z, big = 1) {
  fx({ tex: TEX.glow, color: 0xffb257, x, y: 1, z, s0: 1.5 * big, s1: 7 * big, life: 0.4 });
  fx({ tex: TEX.glow, color: 0xff5a1f, x, y: 1.2, z, s0: 1 * big, s1: 5 * big, life: 0.55 });
  fx({ tex: TEX.glow, color: 0xfff3c0, x, y: 1, z, s0: 0.6 * big, s1: 2.6 * big, life: 0.25 });
  shockwave(x, z, 0xffb257, 9 * big, 0.5);
  for (let i = 0; i < 5; i++) {
    fx({ tex: TEX.puff, color: 0xff7a30, x: x + (Math.random() - 0.5) * 2, y: 0.6, z: z + (Math.random() - 0.5) * 2,
      s0: 1.2, s1: 3.4, life: 0.7 + Math.random() * 0.4, vy: 2.5 + Math.random() * 2, rot: 1.5 });
  }
}
export function critFx(x, y, z) {
  fx({ tex: TEX.star, color: 0xffd94d, x, y, z, s0: 0.6, s1: 1.9, life: 0.28 });
}
export function pickupFx(x, z, color) {
  fx({ tex: TEX.glow, color, x, y: 1, z, s0: 1, s1: 4, life: 0.45 });
  shockwave(x, z, color, 5, 0.4);
}
export function nukeFx(x, z) {
  fx({ tex: TEX.glow, color: 0xfff6d8, x, y: 2, z, s0: 4, s1: 26, life: 0.7 });
  fx({ tex: TEX.glow, color: 0xffc257, x, y: 4, z, s0: 2, s1: 14, life: 1.0, vy: 6 });
  fx({ tex: TEX.puff, color: 0xff9840, x, y: 3, z, s0: 4, s1: 12, life: 1.3, vy: 5, rot: 0.8 });
  shockwave(x, z, 0xfff0b8, 34, 0.9);
  shockwave(x, z, 0xff9840, 22, 0.7);
}
export function frostNovaFx(x, z) {
  fx({ tex: TEX.glow, color: 0xbfeaff, x, y: 1.2, z, s0: 2, s1: 12, life: 0.5 });
  shockwave(x, z, 0x9fdcff, 26, 0.7);
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * 6.28, r = 2 + Math.random() * 8;
    fx({ tex: TEX.flake, color: 0xcdefff, x: x + Math.sin(a) * r, y: 0.5 + Math.random() * 1.5, z: z + Math.cos(a) * r,
      s0: 0.5, s1: 1.4, life: 0.8 + Math.random() * 0.5, vy: 1.2, rot: 2 });
  }
}
export function levelGlowFx(x, z, color = 0xffd94d) {
  fx({ tex: TEX.glow, color, x, y: 1.2, z, s0: 1.5, s1: 6, life: 0.6 });
  fx({ tex: TEX.glow, color: 0xffffff, x, y: 1.8, z, s0: 0.8, s1: 2.4, life: 0.5, vy: 3 });
  shockwave(x, z, color, 7, 0.5);
}
