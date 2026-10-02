"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Factory,
  User,
  FileText,
  ChevronDown,
  History,
  ListChecks,
  Users,
  Shield,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavChild = { name: string; href: string };
type NavItem = {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: NavChild[];
  roles?: string[];
};

const ALL_NAV: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["Super Admin", "Admin", "Shift Manager"],
  },
  {
    name: "Production Planning",
    icon: ClipboardList,
    roles: ["Super Admin", "Admin", "Shift Manager"],
    children: [
      { name: "Planning List", href: "/production-planning/list" },
      { name: "Planning History", href: "/production-planning/history" },
    ],
  },
  {
    name: "Products",
    href: "/production-planning/products",
    icon: Package,
    roles: ["Super Admin", "Admin", "Shift Manager"],
  },
  {
    name: "Production Department",
    icon: Factory,
    roles: ["Super Admin", "Admin", "Shift Manager"],
    children: [
      { name: "Production List", href: "/production-department/list" },
      { name: "Production History", href: "/production-department/history" },
    ],
  },
  {
    name: "My Assignments",
    href: "/operator/assignments",
    icon: ListChecks,
    roles: ["Operator", "Super Admin"],
  },
  {
    name: "Work History",
    href: "/operator/history",
    icon: History,
    roles: ["Super Admin", "Admin", "Shift Manager"],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    roles: ["Super Admin", "Admin", "Shift Manager"],
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
    roles: ["Super Admin", "Admin"],
  },
  {
    name: "Roles",
    href: "/roles",
    icon: Shield,
    roles: ["Super Admin", "Admin"],
  },
  {
    name: "Profile",
    href: "/profile",
    icon: User,
  },
];

function isChildActive(pathname: string, childHref: string): boolean {
  // Exact match for paths without query
  if (!childHref.includes("?")) {
    return pathname === childHref;
  }
  // Should not happen if we use separate paths
  const [path] = childHref.split("?");
  return pathname === path;
}

function SidebarInner() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [role, setRole] = useState<string>("Operator");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role) setRole(d.user.role);
      })
      .catch(() => {});
  }, []);

  // Auto-open parent menu when a child is active
  useEffect(() => {
    const next: Record<string, boolean> = {};
    ALL_NAV.forEach((item) => {
      if (item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"))) {
        next[item.name] = true;
      }
    });
    setOpenMenus((prev) => ({ ...prev, ...next }));
  }, [pathname]);

  const canSee = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  };

  const toggle = (name: string) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const items = ALL_NAV.filter(canSee);

  return (
    <aside className="fixed left-0 top-0 z-40 w-64 h-screen bg-slate-900 text-white flex flex-col print:hidden">
      <div className="p-4 border-b border-slate-700 flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-slate-900">
          K
        </div>
        <div>
          <div className="font-bold text-sm tracking-wide">KAVERI</div>
          <div className="text-[10px] text-slate-400">METALLISING</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => {
          if (item.children) {
            const isOpen =
              openMenus[item.name] ??
              item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggle(item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isOpen ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown
                    className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.children.map((child) => {
                      const active = isChildActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block px-3 py-2 rounded-lg text-sm transition-colors",
                            active
                              ? "bg-blue-600 text-white font-medium"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white"
                          )}
                        >
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active =
            pathname === item.href ||
            (item.href !== undefined && item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.name}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={
      <aside className="fixed left-0 top-0 z-40 w-64 h-screen bg-slate-900" />
    }>
      <SidebarInner />
    </Suspense>
  );
}
