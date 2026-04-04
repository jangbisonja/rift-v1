"use client";

import { createContext, useContext } from "react";

const TokenContext = createContext<string>("");

export function TokenProvider({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  return <TokenContext.Provider value={token}>{children}</TokenContext.Provider>;
}

export function useToken(): string {
  return useContext(TokenContext);
}
