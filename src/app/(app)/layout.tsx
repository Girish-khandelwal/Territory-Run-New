// src/app/(app)/layout.tsx

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // 🔒 Protect all routes inside (app)
  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 ml-[72px] lg:ml-56 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}