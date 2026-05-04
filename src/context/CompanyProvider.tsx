"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type AuthContextType = {
  user: User | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
});

export const useAuth = () => useContext(AuthContext);

const ADMIN_EMAILS = [
  "jayyeung@ucsb.edu",
];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) return;

      const email = u.email?.toLowerCase() || "";
      const isAdmin = ADMIN_EMAILS.includes(email);

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          email: u.email,
          role: isAdmin ? "admin" : "user",
          createdAt: new Date(),
        });
      } else {
        await setDoc(
          ref,
          {
            email: u.email,
            role: isAdmin ? "admin" : "user",
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}