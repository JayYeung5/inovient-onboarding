"use client";

import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import { usePathname } from "next/navigation";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500"],
});

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="
      fixed top-0 left-0 right-0 h-16
      flex items-center justify-between
      px-8
      bg-white/80 backdrop-blur-md
      border-b border-gray-200
      transition-all
      z-50
      "
    >
      {}
      <Link
        href="/"
        className={`${playfair.className} text-xl text-gray-900 hover:opacity-80 transition`}
      >
        Inovient
      </Link>

      {}
      <div className="absolute left-1/2 -translate-x-1/2 flex gap-10">

        <Link
          href="/"
          className={`
            relative text-[15px] tracking-wide transition-all duration-200
            ${
              pathname === "/"
                ? "text-blue-600"
                : "text-gray-700 hover:text-blue-600"
            }
          `}
        >
          Onboarding

          {pathname === "/" && (
            <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-blue-600 rounded-full"></span>
          )}
        </Link>

        <Link
          href="/companies"
          className={`
            relative text-[15px] tracking-wide transition-all duration-200
            ${
              pathname === "/companies"
                ? "text-blue-600"
                : "text-gray-700 hover:text-blue-600"
            }
          `}
        >
          Companies

          {pathname === "/companies" && (
            <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-blue-600 rounded-full"></span>
          )}
        </Link>

      </div>

      {}
      <AuthButton />
    </nav>
  );
}