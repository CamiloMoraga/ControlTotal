"use client";

import { usePathname } from "next/navigation";
import { getCurrentModule } from "@/lib/navigation";

export function AppHeader() {
  const currentModule = getCurrentModule(usePathname());

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-8">
      <span className="text-sm font-medium text-foreground">{currentModule?.title ?? "Control Total"}</span>
      <span className="text-xs text-muted">Control y Monitoreo</span>
    </header>
  );
}
