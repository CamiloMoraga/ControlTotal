import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { requireAuthorizedUser } from "@/lib/auth";
import Link from "next/link";
import { modules, navigationGroups } from "@/lib/navigation";

export const runtime = "nodejs";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthorizedUser();
  return (
    <div className="min-h-screen">
      <a href="#contenido" className="fixed top-3 left-4 z-50 rounded bg-surface px-4 py-2 text-sm text-accent shadow-sm not-focus:sr-only md:left-64">Ir al contenido</a>
      <AppSidebar />
      <div className="flex min-h-screen flex-col md:ml-[232px]">
        <AppHeader email={user.email} />
        <nav aria-label="Navegación móvil" className="flex gap-3 overflow-x-auto border-b border-border bg-surface px-4 py-2 md:hidden">
          {navigationGroups.flatMap((group) => group.items).map((id) => <Link key={id} href={modules[id].href} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-accent-soft">{modules[id].title}</Link>)}
        </nav>
        <main id="contenido" tabIndex={-1} className="w-full max-w-[1680px] flex-1 self-center px-4 py-6 outline-none md:px-8 md:py-7">{children}</main>
      </div>
    </div>
  );
}
