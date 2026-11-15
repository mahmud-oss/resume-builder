"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { authApi, getToken, onUnauthorised, setToken, type User } from "@/lib/api";

type AuthState = {
  user: User | null;
  /** False until we know whether a saved token is still valid. */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    // An expired token is cleared by the api helper; other errors simply leave us signed out.
    Promise.resolve(getToken() ? authApi.me() : null)
      .then((u) => alive && u && setUser(u))
      .catch(() => {})
      .finally(() => alive && setReady(true));
    const off = onUnauthorised(() => setUser(null));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await authApi.login(email, password);
    setToken(r.token);
    setUser(r.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const r = await authApi.register(email, password, name);
    setToken(r.token);
    setUser(r.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
