"use client";

import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const provider = new GoogleAuthProvider();

export const login = async () => {
  await signInWithPopup(auth, provider);
};

export const logout = async () => {
  await signOut(auth);
};