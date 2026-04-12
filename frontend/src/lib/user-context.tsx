"use client";

/**
 * UserContext — provides the current public user to any client component.
 *
 * On mount, calls getMe() to determine auth state from the user_token cookie.
 * The cookie is HTTP-only and unreadable by JS — getMe() is the only way to
 * know if the user is logged in (RULES.md #A1).
 *
 * refreshUser() can be called after login, logout, or nickname change to
 * re-sync state without a full page reload.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getMe } from "@/lib/api/client";
import type { PublicUser } from "@/lib/schemas";

interface UserContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMe();
      setUser(result);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
