"use client";

import { usePathname } from "next/navigation";
import { getCurrentModule } from "@/lib/navigation";
import { LogoutForm } from "@/components/auth/logout-form";

export function AppHeader({ email }: { email: string }) {
  const currentModule = getCurrentModule(usePathname());

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3 md:px-8">
      <span className="text-sm font-medium text-foreground">{currentModule?.title ?? "Control Total"}</span>
      <div className="flex items-center gap-4">
        <span className="hidden text-xs text-muted sm:inline">{email}</span>
        <LogoutForm />
      </div>
    </header>
  );
}
