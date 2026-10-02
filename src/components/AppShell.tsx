"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="pl-64 min-h-screen flex flex-col print:pl-0 print:min-h-0">
        <div className="print:hidden">
          <Header />
        </div>
        <main className="flex-1 p-6 overflow-x-auto print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
