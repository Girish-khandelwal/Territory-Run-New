import type { ReactNode } from 'react'; // ✅ FIX 1
import { Sidebar } from '@/components/layout/Sidebar'; // ✅ FIX 2

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
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