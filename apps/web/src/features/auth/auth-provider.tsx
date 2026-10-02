import { can as roleCan, type LoginInput, type Permission, type SessionDto, type SignupInput } from "@repo/shared";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authFacade } from "@/facades/auth.facade";
import { setAuthToken, setUnauthorizedHandler } from "@/lib/http";

const STORAGE_KEY = "oi-session";

interface AuthCtx {
  session: SessionDto | null;
  /** Checks credentials and stores the session, but does not switch to the app yet. */
  login: (input: LoginInput) => Promise<SessionDto>;
  /** Creates a Staff account and stores its session, like `login`. */
  signup: (input: SignupInput) => Promise<SessionDto>;
  /** Switches to the app. Separate from `login` so the form can play its success state first. */
  commit: (s: SessionDto) => void;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

/** "Remember me" keeps the session in localStorage; otherwise it ends with the browser tab. */
const readSession = (): SessionDto | null => {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const s = JSON.parse(store.getItem(STORAGE_KEY) ?? "null") as SessionDto | null;
      if (s && new Date(s.expiresAt).getTime() > Date.now()) return s;
      store.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable or corrupt: treat as signed out */
    }
  }
  return null;
};

const writeSession = (s: SessionDto | null, remember = true) => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (s) (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: session lasts until reload */
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionDto | null>(() => {
    const s = readSession();
    // Set before the first render so the console's first queries already carry the token.
    setAuthToken(s?.token ?? null);
    return s;
  });
  const queryClient = useQueryClient();

  /** The only way the session changes, so the http client's token never drifts from it. */
  const setSession = useCallback((s: SessionDto | null) => {
    setAuthToken(s?.token ?? null);
    setSessionState(s);
  }, []);

  /** Local sign-out. Cached data belongs to the previous user and role. */
  const clear = useCallback(() => {
    writeSession(null);
    setSession(null);
    queryClient.clear();
  }, [setSession, queryClient]);

  // The server rejected the token (expired, revoked, or password reset elsewhere).
  useEffect(() => {
    setUnauthorizedHandler(clear);
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  // Refresh the stored user once on load, so a role change on the server applies here too.
  useEffect(() => {
    if (!session) return;
    authFacade
      .me()
      .then((user) => {
        const next = { ...session, user };
        writeSession(next, !!localStorage.getItem(STORAGE_KEY));
        setSession(next);
      })
      .catch(() => undefined); // 401 is handled above; a network error keeps the stored session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sign out in every tab when one tab signs out (or the session expires).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setSession(readSession());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setSession]);

  useEffect(() => {
    if (!session) return;
    // setTimeout overflows above ~24.8 days; a "remember me" session simply re-arms on next load.
    const ms = Math.min(new Date(session.expiresAt).getTime() - Date.now(), 2 ** 31 - 1);
    const t = setTimeout(clear, ms);
    return () => clearTimeout(t);
  }, [session, clear]);

  const login = useCallback(async (input: LoginInput) => {
    const s = await authFacade.login(input);
    writeSession(s, input.remember);
    return s;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const s = await authFacade.signup(input);
    writeSession(s, false);
    return s;
  }, []);

  const commit = useCallback((s: SessionDto) => setSession(s), [setSession]);

  const logout = useCallback(async () => {
    // Start the request while the token is still set, then sign out locally without waiting.
    const request = authFacade.logout().catch(() => undefined);
    clear();
    await request;
  }, [clear]);

  const value = useMemo<AuthCtx>(
    () => ({ session, login, signup, logout, commit, can: (p) => !!session && roleCan(session.user.role, p) }),
    [session, login, signup, logout, commit],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

/** Renders children only when the signed-in role has the permission. */
export const Can = ({ permission, children }: { permission: Permission; children: ReactNode }) => (useAuth().can(permission) ? <>{children}</> : null);
