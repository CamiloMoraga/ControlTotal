"use client";

import { usePathname } from "next/navigation";
import { getCurrentModule } from "@/lib/navigation";
import { LogoutForm } from "@/components/auth/logout-form";

export function AppHeader({ email }: { email: string }) {
  const currentModule = getCurrentModule(usePathname());

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-8">
      <span className="text-sm font-medium text-foreground">{currentModule?.title ?? "Control Total"}</span>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted">{email}</span>
        <LogoutForm />
      </div>
    </header>
  );
}
