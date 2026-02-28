"use client";

import { useContext } from "react";
import { AuthContext } from "@/components/AuthProvider";
import { login, logout } from "@/lib/auth";

export default function AuthButton() {
  const user = useContext(AuthContext);

  return (
    <button
      onClick={user ? logout : login}
      className="
        px-4 py-2
        rounded-lg
        border
        border-gray-300
        bg-white
        hover:bg-gray-100
        shadow-sm
        transition
        font-medium
      "
    >
      {user ? "Logout" : "Login"}
    </button>
  );
}