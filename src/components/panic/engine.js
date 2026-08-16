// Pure chess engine for the panic-mode chess bot.
// Every function operates on a chess.js Game instance passed in by the caller.

export const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
export const MATE = 100000;
export const ELO_MIN = 300;
export const ELO_MAX = 3000;

// Piece-square tables, white's perspective (index 0 = a8)
export const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

const KING_RING = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

// Pseudo-legal attack map for `color` (blocking-aware for sliding pieces)
function attackMap(b, color) {
  const atk = new Array(64).fill(false);
  const pdir = color === "w" ? -1 : 1;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (!p || p.color !== color) continue;
      const t = p.type;
      if (t === "p") {
        const nr = r + pdir;
        for (const df of [-1, 1]) {
          const nf = f + df;
          if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) atk[nr * 8 + nf] = true;
        }
      } else if (t === "n") {
        for (const [dr, df] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
          const nr = r + dr, nf = f + df;
          if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) atk[nr * 8 + nf] = true;
        }
      } else if (t === "k") {
        for (const [dr, df] of KING_RING) {
          const nr = r + dr, nf = f + df;
          if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) atk[nr * 8 + nf] = true;
        }
      } else {
        const dirs =
          t === "b"
            ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            : t === "r"
              ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
              : [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, df] of dirs) {
          let nr = r + dr, nf = f + df;
          while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
            atk[nr * 8 + nf] = true;
            if (b[nr][nf]) break;
            nr += dr;
            nf += df;
          }
        }
      }
    }
  }
  return atk;
}

function ringSquares(sq) {
  const r = sq >> 3;
  const f = sq & 7;
  const out = [];
  for (const [dr, df] of KING_RING) {
    const nr = r + dr, nf = f + df;
    if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) out.push(nr * 8 + nf);
  }
  return out;
}

// No enemy pawn on the same or adjacent files ahead of this pawn
function isPassed(b, r, f, color) {
  const step = color === "w" ? -1 : 1;
  for (let rr = r + step; rr >= 0 && rr < 8; rr += step) {
    for (let ff = f - 1; ff <= f + 1; ff++) {
      if (ff < 0 || ff > 7) continue;
      const p = b[rr][ff];
      if (p && p.type === "p" && p.color !== color) return false;
    }
  }
  return true;
}

// evaluate() returns a score from the side-to-move's perspective (negamax convention)
export function evaluate(game) {
  const b = game.board();
  const stm = game.turn();

  const wAtk = attackMap(b, "w");
  const bAtk = attackMap(b, "b");

  let score = 0;
  let wk = -1;
  let bk = -1;
  let wBishops = 0;
  let bBishops = 0;
  let queens = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (!p) continue;
      const idx = r * 8 + f;
      if (p.type === "k") {
        if (p.color === "w") wk = idx;
        else bk = idx;
        continue;
      }

      let v = PIECE_VALUES[p.type] + PST[p.type][p.color === "w" ? idx : 63 - idx];
      if (p.type === "b") {
        if (p.color === "w") wBishops++;
        else bBishops++;
      }
      if (p.type === "q") queens++;
      if (p.type === "p" && isPassed(b, r, f, p.color)) {
        const progress = p.color === "w" ? 7 - r : r;
        v += progress * progress * 6;
      }
      if (p.type === "r") {
        let anyPawn = false;
        let enemyPawn = false;
        for (let rr = 0; rr < 8; rr++) {
          const pp = b[rr][f];
          if (pp && pp.type === "p") {
            anyPawn = true;
            if (pp.color !== p.color) enemyPawn = true;
          }
        }
        if (!anyPawn) v += 20;
        else if (!enemyPawn) v += 10;
      }
      score += p.color === "w" ? v : -v;
    }
  }

  if (wBishops >= 2) score += 25;
  if (bBishops >= 2) score -= 25;

  // King safety — threats landing on the king's ring
  if (wk >= 0) {
    let attacks = 0;
    for (const sq of ringSquares(wk)) if (bAtk[sq]) attacks++;
    if (attacks > 0) score -= attacks * 12;
  }
  if (bk >= 0) {
    let attacks = 0;
    for (const sq of ringSquares(bk)) if (wAtk[sq]) attacks++;
    if (attacks > 0) score += attacks * 12;
  }

  // Mobility / piece activity
  let wMob = 0;
  let bMob = 0;
  for (let i = 0; i < 64; i++) {
    if (wAtk[i]) wMob++;
    if (bAtk[i]) bMob++;
  }
  score += (wMob - bMob) * 2;

  // Endgame — centralize the kings once queens are gone
  if (queens <= 1 && wk >= 0 && bk >= 0) {
    score += PST.k[wk] - PST.k[63 - bk];
  }

  return stm === "w" ? score + 8 : -score + 8;
}

// MVV-LVA ordering: winning captures and promotions first
function orderValue(m) {
  let s = 0;
  if (m.promotion) s += PIECE_VALUES.q;
  if (m.captured) s += 10 * PIECE_VALUES[m.captured] - PIECE_VALUES[m.piece];
  return s;
}

const TT_EXACT = 0;
const TT_LOWER = 1;
const TT_UPPER = 2;

let tt = new Map();
let killers = [];
let deadline = 0;
let nodes = 0;
let stopped = false;

function positionKey(game) {
  return game.fen().split(" ").slice(0, 4).join(" ");
}

// Quiescence search — captures plus full evasions when in check.
// qsPly bounds the extra depth so check-crazy lines can't eat the whole time budget.
function qsearch(game, alpha, beta, ply, qsPly = 0) {
  if (qsPly >= 10) return evaluate(game);
  nodes++;
  if ((nodes & 255) === 0 && performance.now() > deadline) stopped = true;
  if (stopped) return 0;

  const inCheck = game.inCheck();
  if (!inCheck) {
    const stand = evaluate(game);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
  }

  let caps;
  if (inCheck) {
    caps = game.moves({ verbose: true });
  } else {
    caps = [];
    for (const m of game.moves({ verbose: true })) {
      if (m.captured || m.promotion) caps.push(m);
    }
  }
  if (caps.length === 0) return inCheck ? -MATE + ply : alpha;
  caps.sort((a, b) => orderValue(b) - orderValue(a));

  for (const m of caps) {
    game.move(m);
    const s = -qsearch(game, -beta, -alpha, ply + 1, qsPly + 1);
    game.undo();
    if (s >= beta) return beta;
    if (s > alpha) alpha = s;
  }
  return alpha;
}

function negamax(game, depth, alpha, beta, ply) {
  nodes++;
  if ((nodes & 255) === 0 && performance.now() > deadline) stopped = true;
  if (stopped) return 0;

  const key = positionKey(game);
  const entry = tt.get(key);
  if (entry && entry.depth >= depth) {
    if (entry.flag === TT_EXACT) return entry.score;
    if (entry.flag === TT_LOWER && entry.score >= beta) return entry.score;
    if (entry.flag === TT_UPPER && entry.score <= alpha) return entry.score;
  }

  const moves = game.moves({ verbose: true });
  if (moves.length === 0) {
    return game.inCheck() ? -MATE + ply : 0;
  }
  if (game.isThreefoldRepetition()) return 0;
  if (depth <= 0) return qsearch(game, alpha, beta, ply);

  const k1 = killers[ply];
  const k2 = killers[ply + 1];
  moves.forEach((m) => {
    m.order = orderValue(m);
    if (m.san === k1) m.order += 400;
    else if (m.san === k2) m.order += 250;
  });
  moves.sort((a, b) => b.order - a.order);
  if (moves.length > 36) moves.length = 36;

  const origAlpha = alpha;
  let best = -Infinity;
  let bestMove = null;
  for (const m of moves) {
    game.move(m);
    const s = -negamax(game, depth - 1, -beta, -alpha, ply + 1);
    game.undo();
    if (stopped) return 0;
    if (s > best) {
      best = s;
      bestMove = m;
    }
    if (s > alpha) alpha = s;
    if (alpha >= beta) {
      if (!m.captured && !m.promotion && ply < 30) killers[ply] = m.san;
      break;
    }
  }

  let flag = TT_EXACT;
  if (best <= origAlpha) flag = TT_UPPER;
  else if (best >= beta) flag = TT_LOWER;
  tt.set(key, { depth, score: best, flag });
  return best;
}

// Root search: iterative deepening within a time budget.
// opts: { maxDepth, timeMs, window (centipawns of noise), blunderRate (0..1) }
// Returns { move, score } where score is from the side-to-move's perspective.
export function searchRoot(game, opts) {
  const legal = game.moves({ verbose: true });
  if (legal.length === 0) return null;

  if (opts.blunderRate > 0 && Math.random() < opts.blunderRate) {
    return { move: legal[Math.floor(Math.random() * legal.length)], score: 0 };
  }

  deadline = performance.now() + opts.timeMs;
  nodes = 0;
  stopped = false;
  tt = new Map();
  killers = new Array(32).fill("");

  let bestMove = legal[0];
  let bestScore = -Infinity;
  let rootScores = new Map();

  for (let d = 1; d <= opts.maxDepth; d++) {
    if (rootScores.size > 0) {
      legal.sort(
        (a, b) =>
          (rootScores.get(b.san) ?? -Infinity) - (rootScores.get(a.san) ?? -Infinity)
      );
    }
    let iterBest = -Infinity;
    let iterBestMove = null;
    const iterScores = [];
    let completed = true;

    for (const m of legal) {
      if (performance.now() > deadline) {
        completed = false;
        break;
      }
      game.move(m);
      const s = -negamax(game, d - 1, -Infinity, Infinity, 1);
      game.undo();
      if (stopped) {
        completed = false;
        break;
      }
      iterScores.push({ move: m, score: s });
      if (s > iterBest) {
        iterBest = s;
        iterBestMove = m;
      }
    }

    if (!completed) break;
    bestMove = iterBestMove;
    bestScore = iterBest;
    rootScores = new Map(iterScores.map((r) => [r.move.san, r.score]));

    if (bestScore >= MATE - 1000) break;
  }

  if (opts.window > 0 && rootScores.size > 0) {
    const best = Math.max(...rootScores.values());
    const candidates = legal.filter(
      (m) => best - (rootScores.get(m.san) ?? Infinity) <= opts.window
    );
    if (candidates.length > 0) {
      return {
        move: candidates[Math.floor(Math.random() * candidates.length)],
        score: best,
      };
    }
  }
  // Safety net: if the time budget vanished before any iteration finished,
  // fall back to a quick 1-ply capture check rather than returning garbage.
  if (bestScore === -Infinity) {
    let greedy = legal[0];
    let bestGreedy = -Infinity;
    for (const m of legal) {
      game.move(m);
      let s = -qsearch(game, -Infinity, Infinity, 1);
      game.undo();
      if (s > bestGreedy) {
        bestGreedy = s;
        greedy = m;
      }
    }
    return { move: greedy, score: bestGreedy };
  }
  return { move: bestMove, score: bestScore };
}

export function searchBest(game, opts) {
  return searchRoot(game, { ...opts, window: 0, blunderRate: 0 });
}

// Map a 300–3000 Elo rating to search settings.
// High ratings think longer, take the best move and never blunder;
// low ratings think barely at all, play inside a wide noise window and blunder often.
export function paramsForElo(elo) {
  const t = Math.max(0, Math.min(1, (elo - ELO_MIN) / (ELO_MAX - ELO_MIN)));
  return {
    maxDepth: 6,
    timeMs: 120 + Math.round(2080 * Math.pow(t, 1.25)),
    window: Math.round((2.0 - 2.0 * t) * 100),
    blunderRate: Math.round(250 * Math.pow(1 - t, 1.6)) / 1000,
  };
}

const GRADE_OPTS = { maxDepth: 4, timeMs: 260, window: 0, blunderRate: 0 };

// Grade a move the side-to-move just played: brilliant → blunder with a blurb
export function classifyMove(game, move, mover) {
  if (!move) {
    return { label: "Best", tone: "best", desc: "The strongest move available in this position." };
  }
  game.move(move);
  if (game.isCheckmate()) {
    const mated = game.turn();
    game.undo();
    return mated === mover
      ? { label: "Blunder", tone: "blunder", desc: "The move allowed a forced checkmate — the game is lost." }
      : { label: "Brilliant", tone: "brilliant", desc: "Checkmate! A flawless finish to the game." };
  }
  if (game.isStalemate()) {
    game.undo();
    return { label: "Blunder", tone: "blunder", desc: "The move stalemated the opponent and threw away the win." };
  }

  // Best outcome the opponent can reach after the played move (from mover's perspective)
  const oppBest = searchBest(game, GRADE_OPTS);
  const after = oppBest ? -oppBest.score : -evaluate(game);
  game.undo();

  // Best outcome available before the move was played
  const best = searchBest(game, GRADE_OPTS);
  const bestScore = best ? best.score : after;

  const cpl = Math.max(0, Math.round(bestScore - after));
  const isCapture = !!move.captured || move.flags.includes("e");
  const sacrificed =
    isCapture && PIECE_VALUES[move.piece] < PIECE_VALUES[move.captured || "p"];

  if (cpl <= 5) {
    if (move.promotion)
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
