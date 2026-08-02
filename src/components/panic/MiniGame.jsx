import { useState, useEffect, useCallback } from "react";
import { X, Trophy } from "lucide-react";

// Tap-the-flame mini-game: tap rising "urge" orbs to extinguish them before they reach the top
export default function MiniGame({ onClose }) {
  const [orbs, setOrbs] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [missed, setMissed] = useState(0);

  const spawnOrb = useCallback(() => {
    const id = Date.now() + Math.random();
    const left = Math.random() * 80 + 10; // 10% to 90%
    const speed = 0.4 + Math.random() * 0.3 + Math.min(score * 0.01, 0.3);
    setOrbs((prev) => [...prev, { id, left, bottom: 0, speed }]);
  }, [score]);

  useEffect(() => {
    if (gameOver) return;
    const spawnInterval = setInterval(spawnOrb, 900);
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => {
      clearInterval(spawnInterval);
      clearInterval(timer);
    };
  }, [spawnOrb, gameOver]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setGameOver(true);
      setOrbs([]);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (gameOver) return;
    const moveInterval = setInterval(() => {
      setOrbs((prev) =>
        prev
          .map((orb) => ({ ...orb, bottom: orb.bottom + orb.speed }))
          .filter((orb) => {
            if (orb.bottom > 100) {
              setMissed((m) => m + 1);
              return false;
            }
            return true;
          })
      );
    }, 50);
    return () => clearInterval(moveInterval);
  }, [gameOver]);

  const hitOrb = (id) => {
    setOrbs((prev) => prev.filter((o) => o.id !== id));
    setScore((s) => s + 1);
  };

  const restart = () => {
    setScore(0);
    setMissed(0);
    setTimeLeft(30);
    setOrbs([]);
    setGameOver(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#060710] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Score</p>
            <p className="text-xl font-bold text-emerald-400 tabular-nums">{score}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Time</p>
            <p className="text-xl font-bold text-indigo-300 tabular-nums">{timeLeft}s</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Missed</p>
            <p className="text-xl font-bold text-rose-400 tabular-nums">{missed}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Game area */}
      <div className="flex-1 relative overflow-hidden">
        {!gameOver ? (
          <>
            <p className="absolute top-4 left-1/2 -translate-x-1/2 text-center text-slate-500 text-sm z-10 px-4">
              Tap the urges to extinguish them. Don't let them reach the top.
            </p>
            {orbs.map((orb) => (
              <button
                key={orb.id}
                onClick={() => hitOrb(orb.id)}
                className="absolute w-14 h-14 flex items-center justify-center transition-transform active:scale-75"
                style={{
                  left: `${orb.left}%`,
                  bottom: `${orb.bottom}%`,
                  transform: "translateX(-50%)",
                }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500/40 to-red-700/30 border border-rose-400/40 flex items-center justify-center shadow-lg shadow-rose-900/30">
                  <span className="text-xl">🔥</span>
                </div>
              </button>
            ))}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-rose-500/30 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <Trophy className="w-16 h-16 text-amber-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-1">
              {score >= 15 ? "Amazing focus!" : score >= 8 ? "Well done!" : "Good effort!"}
            </h2>
            <p className="text-slate-400 text-sm mb-1">You extinguished {score} urges</p>
            <p className="text-slate-500 text-xs mb-6 max-w-xs">
              Just like in the game, urges pass when you face them head-on. The urge you felt is already weaker.
            </p>
            <div className="flex gap-3">
              <button
                onClick={restart}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium text-sm"
              >
                Play Again
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-medium text-sm"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}