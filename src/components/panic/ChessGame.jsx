import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Chess } from "chess.js";
import { X, RotateCcw, Play, Grip, Dices, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/ThemeContext";
import { chessSounds } from "@/lib/chessSounds";
import {
  classifyMove,
  searchRoot,
  paramsForElo,
  PIECE_VALUES,
  ELO_MIN,
  ELO_MAX,
} from "./engine";

import wK from "@/assets/pieces/wK.svg";
import wQ from "@/assets/pieces/wQ.svg";
import wR from "@/assets/pieces/wR.svg";
import wB from "@/assets/pieces/wB.svg";
import wN from "@/assets/pieces/wN.svg";
import wP from "@/assets/pieces/wP.svg";
import bK from "@/assets/pieces/bK.svg";
import bQ from "@/assets/pieces/bQ.svg";
import bR from "@/assets/pieces/bR.svg";
import bB from "@/assets/pieces/bB.svg";
import bN from "@/assets/pieces/bN.svg";
import bP from "@/assets/pieces/bP.svg";

const PIECE_IMAGES = {
  w: { k: wK, q: wQ, r: wR, b: wB, n: wN, p: wP },
  b: { k: bK, q: bQ, r: bR, b: bB, n: bN, p: bP },
};

// Board colors follow the wallpaper-matched --accent-hue
const SQ_LIGHT = "hsl(var(--accent-hue) 42% 60% / 0.3)";
const SQ_DARK = "hsl(var(--accent-hue) 55% 24% / 0.55)";
const SQ_SELECTED = "hsl(var(--accent-hue) 90% 68% / 0.5)";
const SQ_LAST = "hsl(var(--accent-hue) 82% 58% / 0.32)";
const SQ_CHECK = "hsl(0 90% 58% / 0.55)";
const DOT = "hsl(var(--accent-hue) 90% 80% / 0.95)";
const CAPTURE_RING = "hsl(var(--accent-hue) 95% 82% / 0.95)";

const SIDES = [
  { key: "w", label: "White" },
  { key: "b", label: "Black" },
  { key: "random", label: "Random" },
];
const DEFAULT_ELO = 1200;

function initPieces(board) {
  const out = [];
  let id = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      const square = String.fromCharCode(97 + f) + (8 - r);
      out.push({ id: `p${id++}`, type: p.type, color: p.color, square });
    }
  }
  return out;
}

// Update the rendered piece list after a committed chess.js move
function applyMoveToPieces(pieces, move) {
  const next = pieces.map((p) => ({ ...p }));

  const moving = next.find((p) => p.square === move.from && p.type === move.piece);
  if (!moving) return next;

  if (move.captured) {
    const idx = next.findIndex((p) => p.square === move.to);
    if (idx >= 0) next.splice(idx, 1);
  }
  if (move.flags.includes("e")) {
    // En passant — the captured pawn sits beside the destination
    const epSquare = move.to[0] + move.from[1];
    const idx = next.findIndex((p) => p.square === epSquare);
    if (idx >= 0) next.splice(idx, 1);
  }

  moving.square = move.to;
  if (move.promotion) moving.type = move.promotion;

  // Castling — the rook moves too
  if (move.flags.includes("k") || move.flags.includes("q")) {
    const rank = move.color === "w" ? "1" : "8";
    const kingside = move.flags.includes("k");
    const fromRook = (kingside ? "h" : "a") + rank;
    const toRook = (kingside ? "f" : "d") + rank;
    const rook = next.find((p) => p.square === fromRook);
    if (rook) rook.square = toRook;
  }

  return next;
}

// Reverse a committed move on the rendered piece list (used by undo)
function unapplyMoveToPieces(pieces, move) {
  const next = pieces.map((p) => ({ ...p }));

  const moving = next.find(
    (p) => p.square === move.to && p.type === (move.promotion || move.piece)
  );
  if (moving) {
    moving.square = move.from;
    if (move.promotion) moving.type = move.piece;
  }

  // Bring the captured piece back
  if (move.captured) {
    const capColor = move.color === "w" ? "b" : "w";
    const square = move.flags.includes("e") ? move.to[0] + move.from[1] : move.to;
    next.push({ id: `undo-${move.from}-${move.to}`, type: move.captured, color: capColor, square });
  }

  // Castling — the rook slides back too
  if (move.flags.includes("k") || move.flags.includes("q")) {
    const rank = move.color === "w" ? "1" : "8";
    const kingside = move.flags.includes("k");
    const fromRook = (kingside ? "f" : "d") + rank;
    const toRook = (kingside ? "h" : "a") + rank;
    const rook = next.find((p) => p.square === fromRook);
    if (rook) rook.square = toRook;
  }

  return next;
}

const EVAL_STYLES = {
  brilliant: { container: "border-amber-400/50 bg-amber-500/15", text: "text-amber-300" },
  great: { container: "border-purple-400/50 bg-purple-500/15", text: "text-purple-300" },
  best: { container: "border-emerald-400/50 bg-emerald-500/15", text: "text-emerald-300" },
  excellent: { container: "border-emerald-400/50 bg-emerald-500/15", text: "text-emerald-300" },
  good: { container: "border-emerald-400/40 bg-emerald-500/10", text: "text-emerald-200" },
  inaccuracy: { container: "border-yellow-400/50 bg-yellow-500/15", text: "text-yellow-300" },
  mistake: { container: "border-orange-400/50 bg-orange-500/15", text: "text-orange-300" },
  blunder: { container: "border-rose-400/50 bg-rose-500/15", text: "text-rose-300" },
};

function computeOutcome(game) {
  if (game.isCheckmate()) {
    return { over: true, winner: game.turn() === "w" ? "b" : "w", type: "checkmate" };
  }
  if (game.isStalemate()) return { over: true, winner: null, type: "stalemate" };
  if (game.isThreefoldRepetition()) return { over: true, winner: null, type: "threefold" };
  if (game.isInsufficientMaterial()) return { over: true, winner: null, type: "material" };
  if (game.isDraw()) return { over: true, winner: null, type: "draw" };
  return { over: false };
}

function findKing(game, color) {
  const b = game.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (p && p.type === "k" && p.color === color) {
        return String.fromCharCode(97 + f) + (8 - r);
      }
    }
  }
  return null;
}

// Segmented control with a rounded, sliding selection pill
function Segmented({ options, value, onChange, render = null, className = "" }) {
  const containerRef = useRef(null);
  const btnRefs = useRef([]);
  const [indicator, setIndicator] = useState(null);

  useEffect(() => {
    const measure = () => {
      const idx = options.findIndex((o) => o.key === value);
      const btn = btnRefs.current[idx];
      const container = containerRef.current;
      if (!btn || !container) return;
      const cr = container.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      setIndicator({ left: br.left - cr.left, width: br.width });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex gap-1 bg-white/5 border border-white/10 rounded-full p-1",
        className
      )}
    >
      {indicator && (
        <div
          className="absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_2px_8px_rgba(99,102,241,0.4)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {options.map((opt, i) => (
        <button
          key={opt.key}
          ref={(el) => (btnRefs.current[i] = el)}
          onClick={() => onChange(opt.key)}
          className={cn(
            "relative z-10 flex-1 py-2 rounded-full text-xs font-medium transition-colors duration-300 flex items-center justify-center gap-1.5",
            value === opt.key ? "text-white" : "text-slate-400 hover:text-white"
          )}
        >
          {render ? render(opt) : opt.label}
        </button>
      ))}
    </div>
  );
}

export default function ChessGame({ onClose }) {
  const { wallpaperUrl, wallpaperBlur } = useTheme();
  const gameRef = useRef(new Chess());

  const [phase, setPhase] = useState("setup"); // setup | playing
  const [status, setStatus] = useState("playing"); // playing | over
  const [version, setVersion] = useState(0);
  const [sideChoice, setSideChoice] = useState("w"); // w | b | random
  const [playerColor, setPlayerColor] = useState("w");
  const [botElo, setBotElo] = useState(DEFAULT_ELO);
  const [showHints, setShowHints] = useState(true);
  const [pieces, setPieces] = useState(() => initPieces(gameRef.current.board()));
  const [selected, setSelected] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [captured, setCaptured] = useState({ w: [], b: [] });
  const [lastEval, setLastEval] = useState(null);

  const game = gameRef.current;
  const aiColor = playerColor === "w" ? "b" : "w";

  const piecesRef = useRef(pieces);
  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  const playerColorRef = useRef(playerColor);
  const showHintsRef = useRef(showHints);
  useEffect(() => {
    playerColorRef.current = playerColor;
    showHintsRef.current = showHints;
  }, [playerColor, showHints]);

  const capturedStackRef = useRef([]);

  const startGame = useCallback(() => {
    const color =
      sideChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : sideChoice;
    setPlayerColor(color);
    gameRef.current = new Chess();
    setPieces(initPieces(gameRef.current.board()));
    setSelected(null);
    setLastMove(null);
    setOutcome(null);
    setCaptured({ w: [], b: [] });
    setLastEval(null);
    capturedStackRef.current = [];
    setStatus("playing");
    setPhase("playing");
    chessSounds.start();
    setVersion((v) => v + 1);
  }, [sideChoice]);

  const backToSetup = () => {
    setSelected(null);
    setLastMove(null);
    setOutcome(null);
    setCaptured({ w: [], b: [] });
    setLastEval(null);
    capturedStackRef.current = [];
    setStatus("playing");
    setPhase("setup");
  };

  const commitMove = useCallback((move) => {
    const g = gameRef.current;
    const mover = g.turn();

    let evalInfo = null;
    if (showHintsRef.current && mover === playerColorRef.current) {
      evalInfo = classifyMove(g, move, mover);
    }

    const res = g.move(move);
    if (!res) return false;

    setPieces((prev) => applyMoveToPieces(prev, res));
    setLastMove({ from: res.from, to: res.to });
    setSelected(null);
    // Only update the hint pill for the player's own moves; keep it visible
    // (and readable) while the AI replies.
    if (evalInfo) setLastEval(evalInfo);
    if (evalInfo && (evalInfo.tone === "brilliant" || evalInfo.tone === "great")) {
      chessSounds.praise();
    }

    if (res.captured) {
      const capSquare = res.flags.includes("e") ? res.to[0] + res.from[1] : res.to;
      capturedStackRef.current.push({ mover: res.color, type: res.captured, square: capSquare });
      setCaptured((prev) => ({
        ...prev,
        [res.color]: [...prev[res.color], res.captured],
      }));
    }

    if (res.flags.includes("k") || res.flags.includes("q")) chessSounds.castle();
    else if (res.promotion) chessSounds.promote();
    else if (res.captured) chessSounds.capture();
    else chessSounds.move();

    if (g.inCheck()) setTimeout(() => chessSounds.check(), 140);

    setVersion((v) => v + 1);

    if (g.isGameOver()) {
      const o = computeOutcome(g);
      setOutcome(o);
      setStatus("over");
      if (o.winner === playerColorRef.current) chessSounds.win();
      else if (o.winner) chessSounds.lose();
      else chessSounds.draw();
    }
    return true;
  }, []);

  const undoMove = useCallback(() => {
    if (phase !== "playing") return;
    const g = gameRef.current;
    if (g.history().length === 0) return;

    setSelected(null);
    setLastEval(null);
    // Let the player retract a losing final move even after the game ends.
    if (status !== "playing") {
      setOutcome(null);
      setStatus("playing");
    }

    // If it's the player's turn the AI just replied — take back both moves.
    // If it's the AI's turn the player just moved — take back the player's move.
    const count = g.turn() === playerColorRef.current ? 2 : 1;

    let newPieces = piecesRef.current.map((p) => ({ ...p }));
    for (let i = 0; i < count; i++) {
      const m = g.undo();
      if (!m) break;
      newPieces = unapplyMoveToPieces(newPieces, m);
      const cap = capturedStackRef.current.pop();
      if (cap) {
        setCaptured((prev) => ({
          ...prev,
          [cap.mover]: prev[cap.mover].slice(0, -1),
        }));
      }
    }
    setPieces(newPieces);

    const hist = g.history({ verbose: true });
    setLastMove(
      hist.length
        ? { from: hist[hist.length - 1].from, to: hist[hist.length - 1].to }
        : null
    );
    setThinking(false);
    chessSounds.undo();
    setVersion((v) => v + 1);
  }, [phase, status]);

  // AI's turn
  useEffect(() => {
    if (phase !== "playing" || status !== "playing") return;
    if (game.isGameOver()) {
      setOutcome(computeOutcome(game));
      setStatus("over");
      return;
    }
    if (game.turn() === playerColor) return;

    setThinking(true);
    const t = setTimeout(() => {
      try {
        const best = searchRoot(game, paramsForElo(botElo));
        if (best) {
          commitMove(best.move);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setThinking(false);
      }
    }, 150);
    return () => {
      clearTimeout(t);
      setThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, status, phase, playerColor, botElo]);

  const legalForSelected = useMemo(() => {
    if (!selected) return [];
    try {
      return game.moves({ square: selected, verbose: true });
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, version]);

  const onSquareClick = (square) => {
    if (phase !== "playing" || status !== "playing" || thinking) return;
    if (game.turn() !== playerColor) return;

    if (selected) {
      const move = legalForSelected.find((m) => m.to === square);
      if (move) {
        commitMove(move);
        return;
      }
      if (square === selected) {
        setSelected(null);
        return;
      }
    }

    const piece = game.get(square);
    if (piece && piece.color === playerColor) {
      setSelected(square);
    } else {
      setSelected(null);
    }
  };

  const boardView = useMemo(() => {
    const b = game.board();
    const rows = playerColor === "w" ? b : [...b].reverse();
    const squares = [];
    rows.forEach((row, ri) => {
      const cols = playerColor === "w" ? row : [...row].reverse();
      cols.forEach((piece, ci) => {
        const boardRow = playerColor === "w" ? ri : 7 - ri;
        const boardCol = playerColor === "w" ? ci : 7 - ci;
        const square = String.fromCharCode(97 + boardCol) + (8 - boardRow);
        squares.push({
          square,
          piece,
          boardRow,
          boardCol,
          isDark: (boardRow + boardCol) % 2 === 1,
        });
      });
    });
    return squares;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, playerColor]);

  const piecePos = (square) => {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    const x = playerColor === "w" ? file : 7 - file;
    const y = playerColor === "w" ? 8 - rank : rank - 1;
    return { left: `${x * 12.5}%`, top: `${y * 12.5}%` };
  };

  const checkSquare = game.inCheck() ? findKing(game, game.turn()) : null;

  const materialOf = (list) => list.reduce((s, t) => s + PIECE_VALUES[t], 0);
  const capturedSort = (list) => [...list].sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a]);
  const playerAdv = materialOf(captured[playerColor]) - materialOf(captured[aiColor]);
  const advPawns = Math.abs(playerAdv) / 100;
  const advStr =
    advPawns === Math.round(advPawns)
      ? String(Math.round(advPawns))
      : advPawns.toFixed(1);

  const resultTitle = outcome
    ? outcome.winner
      ? outcome.winner === playerColor
        ? "Checkmate — You Win!"
        : "Checkmate — AI Wins"
      : outcome.type === "stalemate"
        ? "Stalemate — Draw"
        : outcome.type === "threefold"
          ? "Draw — Repetition"
          : outcome.type === "material"
            ? "Draw — Not Enough Material"
            : "Draw"
    : "";
  const resultEmoji = outcome?.winner === playerColor ? "🏆" : outcome?.winner ? "🤖" : "🤝";

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Wallpaper backdrop — matches the app's background image */}
      {wallpaperUrl && (
        <img
          src={wallpaperUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: `blur(${wallpaperBlur}px)`, transform: `scale(${1 + wallpaperBlur / 50})` }}
        />
      )}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#060710]/70 via-transparent to-[#060710]/70" />

      {phase === "setup" ? (
        /* ---------------- Setup ---------------- */
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm glass rounded-3xl p-6">
            <div className="flex items-center justify-center mb-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/40 to-purple-500/25 border border-white/15 flex items-center justify-center">
                <img src={wK} alt="Chess" className="w-12 h-12 drop-shadow-lg" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-1">Chess</h2>
            <p className="text-xs text-slate-400 text-center mb-6">
              Focus your mind. Beat the AI, beat the urge.
            </p>

            <div className="mb-5">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Bot strength</p>
                <span className="text-sm font-bold text-indigo-200 tabular-nums">{botElo} Elo</span>
              </div>
              <input
                type="range"
                min={ELO_MIN}
                max={ELO_MAX}
                step={100}
                value={botElo}
                onChange={(e) => setBotElo(Number(e.target.value))}
                aria-label="Bot strength in Elo"
                className="elo-slider w-full"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1 tabular-nums">
                <span>{ELO_MIN}</span>
                <span className="text-slate-600">Beginner · Casual · Strong · Expert</span>
                <span>{ELO_MAX}</span>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Play as</p>
              <Segmented
                options={SIDES}
                value={sideChoice}
                onChange={setSideChoice}
                render={(s) =>
                  s.key === "random" ? (
                    <>
                      <Dices className="w-4 h-4" />
                      {s.label}
                    </>
                  ) : (
                    <>
                      <img
                        src={PIECE_IMAGES[s.key].k}
                        alt=""
                        className="w-4 h-4 drop-shadow"
                      />
                      {s.label}
                    </>
                  )
                }
              />
            </div>

            <div className="mb-6 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Move hints</span>
              <button
                onClick={() => setShowHints((h) => !h)}
                aria-label="Toggle move hints"
                className={cn(
                  "w-10 h-6 rounded-full transition-colors relative",
                  showHints ? "bg-indigo-500" : "bg-white/10"
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                    showHints ? "translate-x-[18px]" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={startGame}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> Start Game
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------- Game ---------------- */
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Grip className="w-4 h-4 text-indigo-300" /> Chess
              </h2>
              <p className="text-[10px] text-slate-400">
                {botElo} Elo · {playerColor === "w" ? "White" : "Black"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={undoMove}
                disabled={game.history().length === 0}
                aria-label="Undo move"
                title="Undo last move"
                className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:hover:brightness-100"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={backToSetup}
                aria-label="New game"
                className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Board */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-2">
            <div className="w-full max-w-[440px]">
              {/* AI's captures */}
              <div className="flex items-center gap-2 mb-1.5 min-h-[20px]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 w-8 shrink-0">AI</span>
                <div className="flex items-center gap-0.5 flex-wrap">
                  {capturedSort(captured[aiColor]).map((t, i) => (
                    <img
                      key={i}
                      src={PIECE_IMAGES[playerColor][t]}
                      alt=""
                      className="w-[18px] h-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                    />
                  ))}
                  {captured[aiColor].length === 0 && (
                    <span className="text-[9px] text-slate-600">—</span>
                  )}
                </div>
                {playerAdv < 0 && (
                  <span className="text-[10px] font-semibold text-rose-300 ml-auto">-{advStr}</span>
                )}
              </div>

              <div
                className="relative rounded-xl overflow-hidden border border-white/15 shadow-2xl"
                style={{ background: "hsl(var(--accent-hue) 50% 16% / 0.6)" }}
              >
                <div className="grid grid-cols-8 aspect-square">
                  {boardView.map((sq) => {
                    const isSelected = selected === sq.square;
                    const isLast = lastMove && (lastMove.from === sq.square || lastMove.to === sq.square);
                    const isCheck = checkSquare === sq.square;
                    const isLegal = selected && legalForSelected.some((m) => m.to === sq.square);
                    const hasPiece = !!sq.piece;

                    let bg = sq.isDark ? SQ_DARK : SQ_LIGHT;
                    if (isLast) bg = SQ_LAST;
                    if (isSelected) bg = SQ_SELECTED;
                    if (isCheck) bg = SQ_CHECK;

                    return (
                      <button
                        key={sq.square}
                        onClick={() => onSquareClick(sq.square)}
                        className="relative flex items-center justify-center select-none"
                        style={{ backgroundColor: bg }}
                        aria-label={sq.square}
                      >
                        {isLegal && !hasPiece && (
                          <span
                            className="absolute w-[24%] h-[24%] rounded-full pointer-events-none"
                            style={{ background: DOT, boxShadow: `0 0 10px ${DOT}` }}
                          />
                        )}
                        {isLegal && hasPiece && (
                          <span
                            className="absolute inset-[3%] rounded-full border-2 pointer-events-none"
                            style={{ borderColor: CAPTURE_RING }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pieces layer — slides smoothly between squares */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  {pieces.map((p) => (
                    <div
                      key={p.id}
                      className="absolute flex items-center justify-center p-[1%]"
                      style={{
                        ...piecePos(p.square),
                        width: "12.5%",
                        height: "12.5%",
                        transition: "left 0.3s cubic-bezier(0.22, 1, 0.36, 1), top 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    >
                      <img
                        src={PIECE_IMAGES[p.color][p.type]}
                        alt=""
                        draggable={false}
                        className={cn(
                          "w-full h-full drop-shadow-[0_3px_4px_rgba(0,0,0,0.5)]",
                          lastMove?.to === p.square && "animate-chess-land"
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Game over overlay */}
                {status === "over" && outcome && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#060710]/80 backdrop-blur-sm z-20 p-6">
                    <div className="w-full max-w-xs bg-[#0E0F1A]/95 border border-white/15 rounded-3xl p-6 text-center shadow-2xl">
                      <div className="text-5xl mb-2">{resultEmoji}</div>
                      <h3 className="text-lg font-bold text-white mb-1">{resultTitle}</h3>
                      <p className="text-xs text-slate-400 mb-5">
                        {outcome.winner === playerColor
                          ? "You outplayed the urge. The urge you felt is already weaker."
                          : "Good game. The battle is the point — you showed up."}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={startGame}
                          className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium text-sm"
                        >
                          Play Again
                        </button>
                        <button
                          onClick={backToSetup}
                          className="px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white font-medium text-sm"
                        >
                          Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Player's captures */}
              <div className="flex items-center gap-2 mt-1.5 min-h-[20px]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 w-8 shrink-0">You</span>
                <div className="flex items-center gap-0.5 flex-wrap">
                  {capturedSort(captured[playerColor]).map((t, i) => (
                    <img
                      key={i}
                      src={PIECE_IMAGES[aiColor][t]}
                      alt=""
                      className="w-[18px] h-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                    />
                  ))}
                  {captured[playerColor].length === 0 && (
                    <span className="text-[9px] text-slate-600">—</span>
                  )}
                </div>
                {playerAdv > 0 && (
                  <span className="text-[10px] font-semibold text-emerald-300 ml-auto">+{advStr}</span>
                )}
              </div>

              {/* Move quality hint */}
              {showHints && lastEval && (
                <div
                  key={`${lastMove?.from}-${lastMove?.to}-${version}`}
                  className="mt-2 flex items-center justify-center animate-hint-pop"
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 border text-xs max-w-full",
                      EVAL_STYLES[lastEval.tone]?.container
                    )}
                  >
                    <span
                      className={cn(
                        "font-bold whitespace-nowrap",
                        EVAL_STYLES[lastEval.tone]?.text
                      )}
                    >
                      {lastEval.label}
                    </span>
                    <span className="text-slate-300 leading-tight">{lastEval.desc}</span>
                  </div>
                </div>
              )}

              {/* Status line */}
              <div className="mt-3 text-center min-h-[18px]">
                {status === "over" ? (
                  <p className="text-xs text-slate-300">
                    {outcome?.winner === playerColor
                      ? "You win this one. On to the next."
                      : "Better luck next round."}
                  </p>
                ) : thinking ? (
                  <p className="text-xs text-indigo-200 flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce" />
                    AI is thinking…
                  </p>
                ) : (
                  <p className="text-xs text-slate-300">
                    {game.turn() === playerColor ? "Your move" : `AI is playing ${aiColor === "w" ? "White" : "Black"}`}
                    {game.inCheck() && <span className="text-rose-300 font-medium"> · Check!</span>}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
