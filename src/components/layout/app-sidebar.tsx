"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { modules, navigationGroups } from "@/lib/navigation";
import { ModuleIcon } from "@/components/layout/module-icon";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[232px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-text">
      <Link href={modules.inicio.href} className="flex h-20 shrink-0 items-center gap-3 border-b border-sidebar-border px-6" aria-label="Control Total: inicio">
        <span className="flex size-9 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-active text-sm font-bold tracking-tight text-white">CT</span>
        <span>
          <span className="block text-base font-semibold tracking-tight text-white">Control Total</span>
          <span className="mt-0.5 block text-[11px] text-sidebar-muted">Operación de pisciculturas</span>
        </span>
      </Link>

      <nav aria-label="Navegación principal" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-sidebar-muted uppercase">{group.title}</p>
            <ul className="space-y-1">
              {group.items.map((id) => {
                const item = modules[id];
                const active = pathname === item.href;
                return (
                  <li key={id}>
                    <Link href={item.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-[13px] ${active ? "border-sidebar-accent bg-sidebar-active font-semibold text-white" : "border-transparent hover:bg-sidebar-hover hover:text-white"}`}>
                      <ModuleIcon module={id} className="size-[18px] shrink-0" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-muted">
        <span className="font-medium text-sidebar-text">Control Total v2</span>
        <span className="mt-1 block">En desarrollo</span>
      </div>
    </aside>
  );
}
