"use client";

import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default function Navbar() {
  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-gray-700 hover:text-black"
          >
            Inovient
          </Link>

          <Link
            href="/companies"
            className="text-gray-700 hover:text-black"
          >
            Companies
          </Link>
        </div>

        {/* RIGHT SIDE */}
        <AuthButton />

      </div>
    </nav>
  );
}