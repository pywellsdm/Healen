import React, { createContext, useState, useContext, useCallback } from 'react';

const AuthContext = createContext(null);

const PREFIX = "quit-gooning";

function uid() {
  return (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function scanProfile() {
  const raw = localStorage.getItem(`${PREFIX}:profile`);
  if (raw) {
    try {
      return JSON.parse(raw).id;
    } catch {
      /* fall through */
    }
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(PREFIX + ":") || key.startsWith("reclaim-") || key.startsWith("ungoonify-"))) {
      const id = uid();
      localStorage.setItem(`${PREFIX}:profile`, JSON.stringify({ id, createdAt: new Date().toISOString() }));
      return id;
    }
  }
  return null;
}

export const AuthProvider = ({ children }) => {
  const [profileId, setProfileId] = useState(scanProfile);
  const [setupComplete, setSetupComplete] = useState(false);

  const hasProfile = useCallback(() => scanProfile() !== null, []);

  const startFresh = useCallback(() => {
    const id = uid();
    localStorage.setItem(`${PREFIX}:profile`, JSON.stringify({ id, createdAt: new Date().toISOString() }));
    setProfileId(id);
    setSetupComplete(true);
  }, []);

  const ensureProfile = useCallback(() => {
    const current = scanProfile();
    if (current) {
      setProfileId(current);
      return true;
    }
    return false;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: profileId ? { id: profileId, username: "Local profile" } : null,
        isAuthenticated: !!profileId,
        isLoadingAuth: false,
        authChecked: true,
        setupComplete,
        hasProfile,
        ensureProfile,
        startFresh,
        setProfileId,
        setSetupComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
