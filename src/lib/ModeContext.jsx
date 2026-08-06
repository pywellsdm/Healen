import { createContext, useContext, useState, useEffect, useCallback } from "react";

const MODE_KEY = "healen:mode";

const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      return saved === "sleeping" ? "sleeping" : "gooning";
    } catch (e) {
      return "gooning";
    }
  });

  const setMode = useCallback((next) => {
    const value = next === "sleeping" ? "sleeping" : "gooning";
    setModeState(value);
    try {
      localStorage.setItem(MODE_KEY, value);
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch (e) {
      /* ignore */
    }
  }, [mode]);

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
