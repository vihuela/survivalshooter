// Procedural sound effects + ambient music via WebAudio (no audio assets).
let ctx = null, master = null, noiseBuf = null, musicOn = false;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  const len = ctx.sampleRate * 1.2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  startMusic();
}

function env(g, t0, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
}

function noise(t0, dur, filterType, freq, q, peak, dec) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  src.connect(f); f.connect(g); g.connect(master);
  env(g, t0, 0.004, peak, dec);
  src.start(t0); src.stop(t0 + dur);
}

function tone(t0, type, f0, f1, dur, peak) {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  const g = ctx.createGain();
  o.connect(g); g.connect(master);
  env(g, t0, 0.005, peak, dur);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

export const sfx = {
  shoot() { if (!ctx) return; const t = ctx.currentTime;
    noise(t, 0.09, 'bandpass', 1800 + Math.random() * 500, 1.2, 0.16, 0.07);
    tone(t, 'square', 160, 60, 0.05, 0.05);
  },
  hit() { if (!ctx) return; const t = ctx.currentTime;
    noise(t, 0.08, 'lowpass', 900, 1, 0.12, 0.06);
  },
  zombieDie() { if (!ctx) return; const t = ctx.currentTime;
    tone(t, 'sawtooth', 220 + Math.random() * 80, 50, 0.28, 0.08);
    noise(t, 0.2, 'lowpass', 500, 1, 0.1, 0.18);
  },
  growl() { if (!ctx) return; const t = ctx.currentTime;
    tone(t, 'sawtooth', 90 + Math.random() * 40, 60, 0.5, 0.05);
  },
  hurt() { if (!ctx) return; const t = ctx.currentTime;
    tone(t, 'square', 300, 90, 0.18, 0.12);
    noise(t, 0.12, 'lowpass', 700, 1, 0.14, 0.1);
  },
  explosion() { if (!ctx) return; const t = ctx.currentTime;
    noise(t, 0.7, 'lowpass', 350, 0.7, 0.5, 0.6);
    tone(t, 'sine', 110, 30, 0.6, 0.4);
  },
  gateHit() { if (!ctx) return; const t = ctx.currentTime;
    tone(t, 'triangle', 700 + Math.random() * 200, 500, 0.06, 0.05);
  },
  gateBreak() { if (!ctx) return; const t = ctx.currentTime;
    tone(t, 'triangle', 520, 1040, 0.12, 0.15);
    tone(t + 0.1, 'triangle', 660, 1320, 0.16, 0.15);
  },
  pickup() { if (!ctx) return; const t = ctx.currentTime;
    tone(t, 'sine', 660, 660, 0.08, 0.12);
    tone(t + 0.09, 'sine', 990, 990, 0.12, 0.12);
  },
  levelClear() { if (!ctx) return; const t = ctx.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.12, 'triangle', f, f, 0.22, 0.14));
  },
  gameOver() { if (!ctx) return; const t = ctx.currentTime;
    [392, 330, 262, 196].forEach((f, i) => tone(t + i * 0.22, 'sawtooth', f, f * 0.98, 0.4, 0.1));
  },
  bossRoar() { if (!ctx) return; const t = ctx.currentTime;
    tone(t, 'sawtooth', 70, 40, 1.0, 0.22);
    noise(t, 0.8, 'lowpass', 300, 0.8, 0.18, 0.7);
  },
};

// Sparse, ominous ambient loop.
function startMusic() {
  if (musicOn || !ctx) return;
  musicOn = true;
  const g = ctx.createGain(); g.gain.value = 0.08; g.connect(master);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.connect(g);
  const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
  const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 55.5;
  o1.connect(f); o2.connect(f);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoG = ctx.createGain(); lfoG.gain.value = 180;
  lfo.connect(lfoG); lfoG.connect(f.frequency);
  o1.start(); o2.start(); lfo.start();
  // slow heartbeat-ish thump
  const thump = () => {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(t, 'sine', 62, 40, 0.25, 0.1);
    setTimeout(thump, 1800 + Math.random() * 1200);
  };
  setTimeout(thump, 1200);
}
