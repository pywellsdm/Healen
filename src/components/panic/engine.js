// Real Stockfish (v10, compiled to asm.js) running in a Web Worker.
// The worker does all thinking off the main thread, so the UI never freezes.
// Strength is controlled through UCI: UCI_Elo 1320–3190 for high levels,
// Skill Level 0–5 for the weak end of the slider.

import { Chess } from "chess.js";
// `?url` copies the engine script verbatim (no bundling / strict-mode wrapper),
// which is what the emscripten worker needs to run correctly.
import stockfishWorkerUrl from "./engine/stockfish.js?url";

export const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
export const MATE_CP = 100000;
export const ELO_MIN = 300;
export const ELO_MAX = 3000;

// Stockfish's UCI_Elo option is only calibrated 1320–3190. Below that we use
// Skill Level, which plays progressively weaker and blunders on purpose.
const ELO_LIMIT_FLOOR = 1320;
const ELO_LIMIT_CEIL = 3190;

let worker = null;
let workerError = null;
let nextId = 1;
let currentId = null;
const pending = new Map();
let lastScore = { cp: null, mate: null };
let lastElo = undefined;

function parseUci(uci) {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  return { from, to, promotion };
}

function scoreCp(score) {
  if (score == null) return null;
  if (score.cp != null) return score.cp;
  if (score.mate != null) {
    const sign = score.mate > 0 ? 1 : -1;
    return sign * (MATE_CP - Math.abs(score.mate) * 1000);
  }
  return null;
}

function parseInfo(line) {
  const cp = /score cp (-?\d+)/.exec(line);
  const mate = /score mate (-?\d+)/.exec(line);
  if (cp) lastScore = { cp: Number(cp[1]), mate: null };
  else if (mate) lastScore = { cp: null, mate: Number(mate[1]) };
}

function onLine(line) {
  if (typeof line !== "string") return;
  if (line.startsWith("info")) {
    parseInfo(line);
    return;
  }
  if (!line.startsWith("bestmove")) return;
  const parts = line.split(/\s+/);
  const uci = parts[1];
  const id = currentId;
  currentId = null;
  const cb = pending.get(id);
  pending.delete(id);
  if (cb) {
    cb({
      move: uci === "(none)" ? null : uci,
      score: lastScore,
    });
  }
  lastScore = { cp: null, mate: null };
}

export function initEngine() {
  if (worker) return worker;
  worker = new Worker(stockfishWorkerUrl);
  worker.onmessage = (e) => onLine(e.data);
  worker.onerror = (e) => {
    workerError = e.message || "stockfish worker failed";
  };
  worker.postMessage("uci");
  return worker;
}

// One UCI search at a time — commands are serialized so a `bestmove` always
// resolves the search that owns the in-flight `go`.
function queueSearch({ fen, elo, movetime, full }) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    const run = () => {
      currentId = id;
      lastScore = { cp: null, mate: null };
      worker.postMessage("position fen " + fen);
      applyStrength(full ? null : elo);
      worker.postMessage("go movetime " + movetime);
    };
    const prev = pendingSearch;
    pendingSearch = prev.then(run);
  });
}

let pendingSearch = Promise.resolve();

// Interrupt whatever Stockfish is thinking about right now. Queued searches
// still run afterwards (callers drop stale results themselves).
export function cancelSearch() {
  if (worker) worker.postMessage("stop");
}

function applyStrength(elo) {
  if (elo === lastElo) return;
  lastElo = elo;
  if (elo == null || elo >= ELO_LIMIT_CEIL) {
    // Full power (used for grading the player's moves)
    worker.postMessage("setoption name UCI_LimitStrength value false");
    worker.postMessage("setoption name Skill Level value 20");
    return;
  }
  if (elo >= ELO_LIMIT_FLOOR) {
    worker.postMessage("setoption name UCI_LimitStrength value true");
    worker.postMessage(
      `setoption name UCI_Elo value ${Math.round(Math.min(ELO_LIMIT_CEIL, elo))}`
    );
    return;
  }
  worker.postMessage("setoption name UCI_LimitStrength value false");
  const skill = Math.max(
    0,
    Math.min(5, Math.round(((elo - ELO_MIN) / (ELO_LIMIT_FLOOR - ELO_MIN)) * 5))
  );
  worker.postMessage(`setoption name Skill Level value ${skill}`);
}

async function engineSearch(opts) {
  if (workerError) return null;
  initEngine();
  return queueSearch(opts);
}

// Map the 300–3000 Elo slider to { elo, movetime }.
export function paramsForElo(elo) {
  const t = Math.max(0, Math.min(1, (elo - ELO_MIN) / (ELO_MAX - ELO_MIN)));
  return {
    elo,
    movetime: 120 + Math.round(2080 * Math.pow(t, 1.25)),
  };
}

// Pick the AI's move. Returns { move: { from, to, promotion }, score } or null.
export async function searchRoot(game, opts = {}) {
  const legal = game.moves({ verbose: true });
  if (legal.length === 0) return null;
  const res = await engineSearch({
    fen: game.fen(),
    elo: opts.elo,
    movetime: opts.movetime || 1000,
  });
  if (!res || !res.move) return null;
  return { move: parseUci(res.move), score: scoreCp(res.score) };
}

// Grade a move the player just played: brilliant → blunder with a blurb.
// `fenBefore` is the position before the move (side to move = mover).
export async function classifyMove(fenBefore, moveObj, mover) {
  let g;
  try {
    g = new Chess(fenBefore);
  } catch (e) {
    return null;
  }
  let res;
  try {
    res = g.move(moveObj);
  } catch (e) {
    return null;
  }
  if (!res) return null;

  if (g.isCheckmate()) {
    const mated = g.turn();
    return mated === mover
      ? { label: "Blunder", tone: "blunder", desc: "The move allowed a forced checkmate — the game is lost." }
      : { label: "Brilliant", tone: "brilliant", desc: "Checkmate! A flawless finish to the game." };
  }
  if (g.isStalemate()) {
    return { label: "Blunder", tone: "blunder", desc: "The move stalemated the opponent and threw away the win." };
  }

  const afterRes = await engineSearch({ fen: g.fen(), movetime: 400, full: true });
  const after = afterRes ? -scoreCp(afterRes.score) : null;
  const beforeRes = await engineSearch({ fen: fenBefore, movetime: 400, full: true });
  const before = beforeRes ? scoreCp(beforeRes.score) : null;
  if (before == null || after == null) return null;

  const cpl = Math.max(0, Math.round(before - after));
  const isCapture = !!res.captured || res.flags.includes("e");
  const sacrificed =
    isCapture && PIECE_VALUES[res.piece] < PIECE_VALUES[res.captured || "p"];

  if (cpl <= 5) {
    if (res.promotion)
      return { label: "Brilliant", tone: "brilliant", desc: "A promotion that wins — a perfect execution." };
    if (sacrificed)
      return { label: "Brilliant", tone: "brilliant", desc: "Gives up material yet is still the very best move — a stunning exchange." };
    if (isCapture)
      return { label: "Great", tone: "great", desc: "A strong, forcing move — one of the very best here." };
    return { label: "Best", tone: "best", desc: "The strongest move available in this position." };
  }
  if (cpl <= 25) return { label: "Excellent", tone: "excellent", desc: "A strong move — very close to the very best." };
  if (cpl <= 50) return { label: "Good", tone: "good", desc: "A solid move that keeps the position in hand." };
  if (cpl <= 100) return { label: "Inaccuracy", tone: "inaccuracy", desc: "Not the best — the opponent now has a chance to improve." };
  if (cpl <= 300) return { label: "Mistake", tone: "mistake", desc: "A significant slip — the opponent gains a clear advantage." };
  return { label: "Blunder", tone: "blunder", desc: "A serious error — this move gives up material or a winning position." };
}
