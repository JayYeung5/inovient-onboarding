"use client";

import AuthButton from "./AuthButton";

export default function Navbar() {
  return (
    <div className="w-full flex justify-end p-4 border-b">
      <AuthButton />
    </div>
  );
}