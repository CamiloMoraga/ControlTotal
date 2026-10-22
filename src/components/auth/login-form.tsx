"use client";

import { useActionState } from "react";
import { signIn } from "@/app/(auth)/login/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, { error: "" });
  const inputClass = "mt-2 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <form action={formAction} className="mt-7 space-y-5" aria-busy={pending}>
      <div>
        <label htmlFor="email" className="text-sm font-medium">Correo electrónico</label>
        <input id="email" name="email" type="email" autoComplete="username" required
          autoCapitalize="none" spellCheck={false} className={inputClass}
          aria-describedby={state.error ? "login-error" : undefined} />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password"
          required className={inputClass} aria-describedby={state.error ? "login-error" : undefined} />
      </div>
      <div aria-live="polite" aria-atomic="true">
        {state.error && <p id="login-error" role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      </div>
      <button type="submit" disabled={pending}
        className="w-full cursor-pointer rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60">
        {pending ? "Iniciando sesión…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
