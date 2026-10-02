"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  ChevronDown,
  Loader2,
  ClipboardList,
  X,
} from "lucide-react";

type UserInfo = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type NotifItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  time?: string;
};

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  if (dark) {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
  try {
    localStorage.setItem("kaveri-theme", dark ? "dark" : "light");
  } catch {
    /* ignore */
  }
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Init theme from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kaveri-theme");
      const preferDark =
        saved === "dark" ||
        (!saved &&
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setDark(!!preferDark);
      applyTheme(!!preferDark);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/production-plans?status=");
      const data = await res.json();
      const plans = (data.plans || []).slice(0, 8);
      const items: NotifItem[] = plans.map((p: any) => ({
        id: String(p.id),
        title: p.planning_number || `Plan #${p.id}`,
        subtitle: `${p.product_name || "—"} · ${p.status || "—"}`,
        href: `/production-planning/view/${p.id}`,
        time: p.plan_date
          ? new Date(p.plan_date).toLocaleDateString("en-GB")
          : undefined,
      }));
      setNotifs(items);
    } catch {
      setNotifs([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next);
  };

  const toggleBell = () => {
    const next = !bellOpen;
    setBellOpen(next);
    setOpen(false);
    if (next) loadNotifications();
  };

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  return (
    <header className="h-14 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-end px-6 gap-2 sticky top-0 z-30 print:hidden">
      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition-colors"
      >
        {dark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {/* Notifications */}
      <div className="relative" ref={bellRef}>
        <button
          type="button"
          onClick={toggleBell}
          title="Notifications"
          className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {notifs.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
          {!notifLoading && notifs.length === 0 && bellOpen === false && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {bellOpen && (
          <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-50 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Recent plans
              </p>
              <button
                type="button"
                onClick={() => setBellOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifLoading ? (
                <div className="px-4 py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : notifs.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                  No recent plans
                </div>
              ) : (
                notifs.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setBellOpen(false)}
                    className="flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 transition-colors"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {n.subtitle}
                      </p>
                      {n.time && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{n.time}</p>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
            <Link
              href="/production-planning/list"
              onClick={() => setBellOpen(false)}
              className="block text-center text-xs font-medium text-blue-600 dark:text-blue-400 px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              View all plans
            </Link>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative pl-3 border-l border-slate-200 dark:border-slate-700" ref={menuRef}>
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setBellOpen(false);
          }}
          className="flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg py-1 px-1.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
            {initials}
          </div>
          <div className="text-sm text-left hidden sm:block">
            <div className="font-medium text-slate-800 dark:text-slate-100 leading-tight">
              {user?.name || "Admin User"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {user?.role || "Super Admin"}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg py-1.5 z-50">
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {user?.name || "Admin User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email || "admin@kaveri.com"}
              </p>
            </div>

            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              Edit Profile
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              {loggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
