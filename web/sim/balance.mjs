// Difficulty model for Dead Rush arena mode.
// Mirrors the in-game formulas; simulates players of different dodging skill.
// skill = fraction of contact damage avoided by kiting (0 = statue, 1 = untouchable)

function simulate(skill, opts = {}) {
  const spawnBase = opts.spawnBase ?? 1.3;
  const spawnRamp = opts.spawnRamp ?? 0.032;
  const hpGrowth = opts.hpGrowth ?? null;  // exponential per 30s, e.g. 1.33
  const hpDelay = opts.hpDelay ?? 0;       // seconds before exponential growth kicks in
  const surgeN = opts.surgeN ?? 16;
  const surgeFrom = opts.surgeFrom ?? 45;
  const hpStep = opts.hpStep ?? 0.4;       // linear fallback per 30s
  const rateUp = opts.rateUp ?? 1.2;
  const critCap = opts.critCap ?? 0.6;
  const tier2Mul = opts.tier2Mul ?? 2.1;
  const bossBase = opts.bossBase ?? 300;
  const pressAt = opts.pressAt ?? 14;
  const maxN = opts.maxN ?? 50;  const dt = 0.1;
  let t = 0, hp = 100, maxHp = 100;
  let N = 0;                                // active horde size
  let xp = 0, lv = 1, xpNeed = 12;
  let fireRate = 4.2, dmg = 1, streams = 0, tier = 0, crit = 0, pierce = 0, lifesteal = 0;
  let kills = 0, deadAt = null, bossesKilled = 0, bossHp = 0, bossCount = 0;
  let medCd = 10;                           // pickup cadence ~8-13s, not always med
  const events = [];

  // average upgrade pick order (rotates through what a reasonable player takes)
  const picks = ['rate', 'dmg', 'stream', 'crit', 'pierce', 'hp', 'ls'];
  let pi = 0;

  while (t < 900 && deadAt === null) {
    t += dt;
    // ---- spawning (matches directorStep) ----
    N += (spawnBase + t * spawnRamp) * dt;
    if (t >= surgeFrom && Math.floor((t - dt) / 45) < Math.floor(t / 45)) N += surgeN; // surge waves
    if (Math.floor((t - dt) / 120) < Math.floor(t / 120)) {           // boss
      bossCount++;
      bossHp = bossBase * (1 + (bossCount - 1) * 0.9);
    }
    N = Math.min(maxN, N);

    // ---- player dps (matches TIERS + upgrades) ----
    const hpScale = hpGrowth ? Math.pow(hpGrowth, Math.max(0, t - hpDelay) / 30) : 1 + Math.floor(t / 30) * hpStep;
    // horde mix drifts toward runners/brutes over time
    const bruteP = t > 140 ? Math.min(0.14, 0.05 + t / 3000) : 0;
    const runnerP = t > 20 ? Math.min(0.45, 0.2 + t / 800) : 0;
    const avgHp = (3 * (1 - bruteP - runnerP) + 2 * runnerP + 30 * bruteP) * hpScale;
    const tierMul = tier === 0 ? 1 : tier === 1 ? 1.25 : tier2Mul;
    const tierStreams = tier === 0 ? 1 : 2;
    const rate = fireRate * tierMul;
    const nStreams = Math.min(4, tierStreams + streams);
    const bulletDmg = (dmg + (tier === 2 ? 1 : 0)) * (1 + crit * 2);
    const hitEff = 0.8 * (1 + pierce * 0.3);          // pierce multiplies effective hits
    const dps = rate * nStreams * bulletDmg * hitEff;

    // ---- combat ----
    let dpsToHorde = dps;
    if (bossHp > 0) { const share = 0.55; bossHp -= dps * share * dt; dpsToHorde = dps * (1 - share);
      if (bossHp <= 0) { bossesKilled++; if (tier < 2) tier++; else dmg += 1; } }
    const killRate = Math.min(N / dt, dpsToHorde / avgHp);
    N = Math.max(0, N - killRate * dt);
    kills += killRate * dt;
    xp += killRate * dt;                               // ~1 gem per kill
    while (xp >= xpNeed) {
      xp -= xpNeed; lv++; xpNeed = 12 + lv * 10;
      const p = picks[pi++ % picks.length];
      if (p === 'rate') fireRate *= rateUp;
      else if (p === 'dmg') dmg += 1;
      else if (p === 'stream' && streams < 2) streams++;
      else if (p === 'crit' && crit < critCap) crit += 0.15;
      else if (p === 'pierce' && pierce < 3) pierce++;
      else if (p === 'hp') { maxHp += 25; hp = Math.min(maxHp, hp + 25); }
      else if (p === 'ls') lifesteal += 2;
    }
    // weapon barrels: ~every 38s until tier 2
    if (tier === 0 && t > 38) tier = 1;
    else if (tier === 1 && t > 110) tier = 2;

    // ---- incoming damage: pressure grows with horde size ----
    const press = Math.max(0, (N - pressAt) / 20);     // > pressAt zombies → contact starts
    const bossPress = bossHp > 0 ? 0.35 : 0;
    const incoming = (10.6 * Math.min(1.6, press) + 22 / 0.9 * bossPress * 0.3) * (1 - skill);
    hp -= incoming * dt;
    hp += (lifesteal * killRate / 10) * dt;            // 嗜血
    medCd -= dt;
    if (medCd <= 0 && hp < maxHp * 0.75) { hp = Math.min(maxHp, hp + 35); medCd = 24; } // med every ~2-3 pickups
    if (hp <= 0) deadAt = t;

    if (Math.floor((t - dt) / 30) < Math.floor(t / 30)) {
      events.push({ t: Math.round(t), N: Math.round(N), dps: Math.round(dps), avgHp: avgHp.toFixed(1), hp: Math.round(hp), lv, tier });
    }
  }
  return { deadAt, kills: Math.round(kills), lv, bossesKilled, events };
}

const fmt = (s) => s === null ? '>15:00 (没死)' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const CONFIGS = {
  'D 1.28延迟60': { hpGrowth: 1.28, hpDelay: 60, spawnBase: 1.3, rateUp: 1.15, critCap: 0.45, tier2Mul: 1.8, bossBase: 500, pressAt: 13, surgeN: 12, surgeFrom: 60 },
  'E 1.32延迟75': { hpGrowth: 1.32, hpDelay: 75, spawnBase: 1.3, rateUp: 1.15, critCap: 0.45, tier2Mul: 1.8, bossBase: 500, pressAt: 13, surgeN: 12, surgeFrom: 60 },
  'F 1.32延迟90': { hpGrowth: 1.32, hpDelay: 90, spawnBase: 1.3, rateUp: 1.15, critCap: 0.45, tier2Mul: 1.8, bossBase: 500, pressAt: 13, surgeN: 12, surgeFrom: 60 },
  'G 1.36延迟90': { hpGrowth: 1.36, hpDelay: 90, spawnBase: 1.3, rateUp: 1.15, critCap: 0.45, tier2Mul: 1.8, bossBase: 500, pressAt: 13, surgeN: 12, surgeFrom: 60 },
};
for (const [name, cfg] of Object.entries(CONFIGS)) {
  console.log(`=== ${name} ===`);
  for (const skill of [0.2, 0.5, 0.8]) {
    const r = simulate(skill, cfg);
    console.log(`  skill=${skill}: 存活 ${fmt(r.deadAt)}, 击杀 ${r.kills}, LV${r.lv}, Boss ${r.bossesKilled}`);
  }
}
