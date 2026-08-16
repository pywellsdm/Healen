// Tiny synthesized chess sound effects via the Web Audio API.
// Fully local — no audio files, no network.

let ctx = null;

function getCtx() {
  if (!ctx) {
    const webkitAC = /** @type {any} */ (window).webkitAudioContext;
    const AC = window.AudioContext || webkitAC;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone({ freq, at = 0, dur = 0.15, type = "sine", gain = 0.15, freqEnd = null }) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const chessSounds = {
  move() {
    tone({ freq: 540, dur: 0.11, type: "triangle", gain: 0.16 });
    tone({ freq: 320, at: 0.02, dur: 0.08, type: "sine", gain: 0.08, freqEnd: 240 });
  },
  capture() {
    tone({ freq: 220, dur: 0.12, type: "square", gain: 0.12, freqEnd: 160 });
    tone({ freq: 420, at: 0.03, dur: 0.1, type: "triangle", gain: 0.14 });
  },
  castle() {
    tone({ freq: 380, dur: 0.08, type: "triangle", gain: 0.14 });
    tone({ freq: 520, at: 0.08, dur: 0.08, type: "triangle", gain: 0.14 });
    tone({ freq: 680, at: 0.16, dur: 0.1, type: "triangle", gain: 0.12 });
  },
  promote() {
    tone({ freq: 520, dur: 0.09, type: "triangle", gain: 0.16 });
    tone({ freq: 660, at: 0.09, dur: 0.09, type: "triangle", gain: 0.16 });
    tone({ freq: 880, at: 0.18, dur: 0.16, type: "triangle", gain: 0.16 });
  },
  check() {
    tone({ freq: 740, dur: 0.09, type: "sine", gain: 0.16 });
    tone({ freq: 988, at: 0.08, dur: 0.14, type: "sine", gain: 0.16 });
  },
  win() {
    tone({ freq: 523, dur: 0.14, type: "triangle", gain: 0.18 });
    tone({ freq: 659, at: 0.14, dur: 0.14, type: "triangle", gain: 0.18 });
    tone({ freq: 784, at: 0.28, dur: 0.28, type: "triangle", gain: 0.18 });
  },
  lose() {
    tone({ freq: 330, dur: 0.2, type: "sine", gain: 0.16, freqEnd: 300 });
    tone({ freq: 262, at: 0.2, dur: 0.2, type: "sine", gain: 0.16, freqEnd: 235 });
    tone({ freq: 196, at: 0.4, dur: 0.35, type: "sine", gain: 0.14, freqEnd: 175 });
  },
  draw() {
    tone({ freq: 440, dur: 0.16, type: "triangle", gain: 0.15 });
    tone({ freq: 440, at: 0.2, dur: 0.2, type: "triangle", gain: 0.12 });
  },
  praise() {
    tone({ freq: 660, dur: 0.1, type: "triangle", gain: 0.14 });
    tone({ freq: 880, at: 0.09, dur: 0.18, type: "triangle", gain: 0.14 });
  },
  start() {
    tone({ freq: 440, dur: 0.1, type: "triangle", gain: 0.15 });
    tone({ freq: 587, at: 0.09, dur: 0.1, type: "triangle", gain: 0.15 });
    tone({ freq: 880, at: 0.18, dur: 0.16, type: "triangle", gain: 0.15 });
  },
  undo() {
    tone({ freq: 520, dur: 0.07, type: "triangle", gain: 0.12, freqEnd: 340 });
  },
};
