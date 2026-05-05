"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Play,
  Map,
  Trophy,
  User,
  LogOut,
  Zap,
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/track", icon: Play, label: "Track" },
  { href: "/map", icon: Map, label: "Territory" },
  { href: "/leaderboard", icon: Trophy, label: "Ranks" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userColor =
    (session?.user as any)?.color ?? "#14b8a6"; // safe fallback

  return (
    <aside className="fixed left-0 top-0 h-screen w-[72px] lg:w-56 glass border-r border-white/5 z-40 flex flex-col py-6 px-3 transition-all duration-300">
      
      {/* 🔷 LOGO */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-500/20 border border-brand-500/30 flex-shrink-0">
          <Zap className="w-5 h-5 text-brand-400" />
        </div>

        <span className="hidden lg:block font-display text-xl text-slate-100 tracking-wide">
          Territory<span className="text-brand-400">Run</span>
        </span>
      </div>

      {/* 🔷 NAVIGATION */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                active
                  ? "bg-brand-500/15 text-brand-400 border border-brand-500/20"
                  : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              <Icon
                className={clsx(
                  "w-5 h-5 flex-shrink-0",
                  active
                    ? "text-brand-400"
                    : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span className="hidden lg:block text-sm font-medium">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* 🔷 USER + LOGOUT */}
      <div className="border-t border-white/5 pt-4">
        
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 ring-2"
            style={{
              backgroundColor: userColor,
              boxShadow: `0 0 0 2px ${userColor}33`,
            }}
          />

          <div className="hidden lg:block min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {session?.user?.name ?? "User"}
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Your color
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() =>
            signOut({ callbackUrl: "/auth/signin" })
          }
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block text-sm">
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}