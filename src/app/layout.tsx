"use client";

import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import CompanyProvider from "@/context/CompanyProvider";
import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CompanyProvider>
            <Navbar />
            <main className="p-6">{children}</main>
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}