"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/app/(auth)/login/actions";

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="cursor-pointer rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60">
      {pending ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
  );
}

export function LogoutForm() {
  return <form action={signOut}><LogoutButton /></form>;
}
