import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: "var(--app-bg)" }}
    >
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-[-160px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[130px] animate-pulse-slow"
          style={{ background: "var(--ambient-1)" }}
        />
        <div
          className="absolute bottom-[-140px] right-[-100px] w-[420px] h-[420px] rounded-full blur-[110px]"
          style={{ background: "var(--ambient-2)" }}
        />
        <div
          className="absolute top-1/3 left-[-140px] w-[340px] h-[340px] rounded-full blur-[90px]"
          style={{ background: "var(--ambient-3)" }}
        />
      </div>

      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/40 flex items-center justify-center mb-6"
        >
          <motion.span
            className="text-4xl font-black text-white"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            U
          </motion.span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease: EASE }}
          className="text-3xl font-bold tracking-tight text-white"
        >
          UnGoonify
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-xs uppercase tracking-[0.35em] text-indigo-300/70 mt-2"
        >
          Take back your mind
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-8 flex gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-400"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
