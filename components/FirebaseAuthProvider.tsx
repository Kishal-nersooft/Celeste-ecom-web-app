"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";

export const AUTH_LOADING_TIMEOUT_MS = 4000;

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  /** True when the auth check timed out or failed before Firebase confirmed a user or guest. */
  unresolved: boolean;
  /** True only after Firebase confirmed there is no signed-in user. */
  isGuest: boolean;
  retry: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code: string }).code)
      : "";
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message: string }).message)
      : String(error ?? "");

  if (
    code === "auth/network-request-failed" ||
    /network-request-failed/i.test(message)
  ) {
    return "Couldn't connect. Check your network and try again.";
  }
  if (!code && error instanceof Error && error.message) {
    return error.message;
  }
  return "Couldn't verify your sign-in. Please try again.";
}

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const userRef = useRef<FirebaseUser | null>(null);

  userRef.current = user;

  const applyAuthState = useCallback((firebaseUser: FirebaseUser | null) => {
    const previous = userRef.current;
    if (
      previous &&
      firebaseUser &&
      previous.uid !== firebaseUser.uid &&
      typeof window !== "undefined"
    ) {
      localStorage.removeItem("cart-store");
    }
    setUser(firebaseUser);
    setLoading(false);
    setError(null);
    setUnresolved(false);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await auth.signOut();
      if (typeof window !== "undefined") {
        localStorage.removeItem("cart-store");
      }
    } catch (logoutError) {
      console.error("Logout failed:", logoutError);
    }
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    const finishWithUser = (firebaseUser: FirebaseUser | null) => {
      if (cancelled) return;
      settled = true;
      applyAuthState(firebaseUser);
    };

    const finishUnresolved = (authError: unknown) => {
      if (cancelled) return;
      if (auth.currentUser) {
        settled = true;
        applyAuthState(auth.currentUser);
        return;
      }
      if (settled) return;
      settled = true;
      setError(getAuthErrorMessage(authError));
      setUnresolved(true);
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        finishWithUser(firebaseUser);
      },
      (authError) => {
        console.error("Firebase auth error:", authError);
        finishUnresolved(authError);
      }
    );

    if (attempt > 0 && auth.currentUser) {
      auth.currentUser.getIdToken(true).catch((tokenError) => {
        console.error("Firebase auth retry failed:", tokenError);
      });
    }

    const timeoutId = window.setTimeout(() => {
      finishUnresolved(
        new Error("Couldn't verify your sign-in. Check your connection and retry.")
      );
    }, AUTH_LOADING_TIMEOUT_MS);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, [attempt, applyAuthState]);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      unresolved,
      isGuest: !loading && !user && !unresolved,
      retry,
      logout,
    }),
    [user, loading, error, unresolved, retry, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a FirebaseAuthProvider");
  }
  return context;
};
