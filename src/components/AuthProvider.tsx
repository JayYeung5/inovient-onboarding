"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext<User | null>(null);

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  );
}