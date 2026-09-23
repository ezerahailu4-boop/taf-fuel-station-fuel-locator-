"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, setAuthToken, type ApiOptions } from "@/lib/client/api";
import type { PublicUser } from "@/types/auth";
import "@/types/telegram";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous"; inTelegram: boolean }
  | { status: "authenticated"; user: PublicUser };

interface AuthContextValue {
  state: AuthState;
  /** Authenticated fetch (Bearer token in Telegram, cookie on the web). */
  api: <T>(path: string, opts?: Omit<ApiOptions, "token">) => Promise<T>;
  loginWithPassword: (password: string) => Promise<void>;
  loginWithCode: (telegramId: string, code: string) => Promise<void>;
  requestCode: (telegramId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;
      try {
        if (initData) {
          tg?.ready();
          tg?.expand();
          const res = await apiFetch<{ token: string; user: PublicUser }>("/api/auth/telegram", {
            method: "POST",
            body: { initData },
          });
          if (cancelled) return;
          setToken(res.token);
          setAuthToken(res.token);
          setState({ status: "authenticated", user: res.user });
          return;
        }
        const me = await apiFetch<{ user: PublicUser }>("/api/auth/me");
        if (!cancelled) setState({ status: "authenticated", user: me.user });
      } catch {
        if (!cancelled) setState({ status: "anonymous", inTelegram: Boolean(initData) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const api = useCallback(
    <T,>(path: string, opts: Omit<ApiOptions, "token"> = {}) => apiFetch<T>(path, { ...opts, token }),
    [token],
  );

  const requestCode = useCallback(async (telegramId: string) => {
    await apiFetch("/api/auth/otp/request", { method: "POST", body: { telegramId } });
  }, []);

  const loginWithPassword = useCallback(async (password: string) => {
    const res = await apiFetch<{ user: PublicUser; token?: string }>("/api/auth/password", {
      method: "POST",
      body: { password },
    });
    if (res.token) {
      setToken(res.token);
      setAuthToken(res.token);
    }
    setState({ status: "authenticated", user: res.user });
  }, []);

  const loginWithCode = useCallback(async (telegramId: string, code: string) => {
    const res = await apiFetch<{ user: PublicUser; token?: string }>("/api/auth/otp/verify", {
      method: "POST",
      body: { telegramId, code },
    });
    if (res.token) {
      setToken(res.token);
      setAuthToken(res.token);
    }
    setState({ status: "authenticated", user: res.user });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    setAuthToken(null);
    setState({ status: "anonymous", inTelegram: false });
  }, []);

  const value = useMemo(
    () => ({ state, api, loginWithPassword, loginWithCode, requestCode, logout }),
    [state, api, loginWithPassword, loginWithCode, requestCode, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
