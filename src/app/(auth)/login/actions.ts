"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthorization } from "@/lib/auth";
import { clearAuthCookies, createClient } from "@/lib/supabase/server";

export type LoginState = { error: string };

export async function signIn(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  try {
    const supabase = await createClient({ canWriteCookies: true });
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      return { error: error.status && error.status < 500
        ? "No se pudo iniciar sesión. Revisa tu correo y contraseña."
        : "No se pudo conectar con el servicio de autenticación. Intenta nuevamente." };
    }

    const authorization = await getAuthorization(supabase);
    if (authorization.status !== "authorized") {
      // Authorization always uses getUser(), never the email from the form.
      try {
        await supabase.auth.signOut({ scope: "local" });
      } finally {
        await clearAuthCookies();
      }
      return { error: authorization.status === "denied"
        ? "Esta cuenta no tiene acceso a Control Total."
        : "No se pudo verificar el acceso. Intenta nuevamente o contacta al administrador." };
    }
  } catch {
    await clearAuthCookies();
    return { error: "No se pudo completar el inicio de sesión. Intenta nuevamente." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  let remoteError = false;
  try {
    const supabase = await createClient({ canWriteCookies: true });
    const { error } = await supabase.auth.signOut({ scope: "local" });
    remoteError = !!error;
  } catch {
    remoteError = true;
  } finally {
    await clearAuthCookies();
  }

  revalidatePath("/", "layout");
  redirect(remoteError ? "/login?reason=logout-local" : "/login");
}
