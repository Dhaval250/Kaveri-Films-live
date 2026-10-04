"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden print:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      <div className="print:hidden">
        <Sidebar mobileOpen={mobileOpen} onClose={closeMobile} />
      </div>

      <div className="lg:pl-64 min-h-screen flex flex-col print:pl-0 print:min-h-0">
        <div className="print:hidden">
          <Header onMenuClick={toggleMobile} />
        </div>
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden print:p-0 print:overflow-visible">
          <div className="w-full max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
