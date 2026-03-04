"use client";

import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

export default function AuthButton() {
  const { user } = useAuth();

  async function login() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function logout() {
    await signOut(auth);
  }

  if (!user) {
    return (
      <button
        onClick={login}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Login
      </button>
    );
  }

  return (
    <button
      onClick={logout}
      className="bg-gray-200 px-4 py-2 rounded"
    >
      Logout
    </button>
  );
}