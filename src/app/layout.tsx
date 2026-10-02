import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Kaveri Metallising | Production Planning",
  description: "Production Planning System for Kaveri Metallising",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
