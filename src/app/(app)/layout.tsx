import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { requireAuthorizedUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthorizedUser();
  return (
    <div className="min-h-screen">
      <a href="#contenido" className="fixed top-3 left-64 z-50 rounded bg-surface px-4 py-2 text-sm text-accent shadow-sm not-focus:sr-only">Ir al contenido</a>
      <AppSidebar />
      <div className="ml-[232px] flex min-h-screen flex-col">
        <AppHeader email={user.email} />
        <main id="contenido" tabIndex={-1} className="w-full max-w-[1680px] flex-1 self-center px-8 py-7 outline-none">{children}</main>
      </div>
    </div>
  );
}
