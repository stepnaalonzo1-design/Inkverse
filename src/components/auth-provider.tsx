"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@/components/toast-provider";
import type { PublicUser } from "@/lib/auth";
import {
  api,
  clearStoredSessionToken,
  getStoredSessionToken,
  setStoredSessionToken,
} from "@/lib/client-api";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  setSession: (user: PublicUser, sessionToken?: string | null) => void;
  refreshAuth: () => Promise<PublicUser | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: PublicUser | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [loading, setLoading] = useState<boolean>(initialUser === null);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setLoading(false);
    }
  }, [initialUser]);

  const refreshAuth = useCallback(async (): Promise<PublicUser | null> => {
    const result = await api<{ user?: PublicUser | null }>("/api/auth/me", "GET");
    if (result.ok && result.data.user) {
      setUser(result.data.user);
      setLoading(false);
      return result.data.user;
    }
    if (result.status === 401) {
      clearStoredSessionToken();
      setUser(null);
    }
    setLoading(false);
    return null;
  }, []);

  useEffect(() => {
    // Always verify or hydrate session on mount if not already provided by SSR or if a token exists in storage
    const storedToken = getStoredSessionToken();
    if (!initialUser && !storedToken) {
      setLoading(false);
      return;
    }
    void refreshAuth();
  }, [initialUser, refreshAuth]);

  const setSession = useCallback((nextUser: PublicUser, sessionToken?: string | null) => {
    if (sessionToken) {
      setStoredSessionToken(sessionToken);
    }
    setUser(nextUser);
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    const result = await api("/api/auth/logout", "POST");
    clearStoredSessionToken();
    setUser(null);
    setLoading(false);
    notify({
      tone: result.ok ? "success" : "info",
      title: "Signed out",
      description: "Your session has been terminated.",
    });
    router.push("/login");
    router.refresh();
  }, [notify, router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      setSession,
      refreshAuth,
      signOut,
    }),
    [user, loading, setSession, refreshAuth, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return context;
}
