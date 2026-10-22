import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { LogoutForm } from "@/components/auth/logout-form";
import { getAuthorization } from "@/lib/auth";

const notices: Record<string, string> = {
  session: "Inicia sesión para continuar. Si tu sesión caducó, ingresa nuevamente.",
  denied: "Esta cuenta no tiene acceso a Control Total.",
  configuration: "El acceso no está configurado. Contacta al administrador.",
  unavailable: "No se pudo verificar la sesión. Intenta nuevamente en unos momentos.",
  "logout-local": "La sesión de este navegador se cerró. No se pudo confirmar el cierre remoto con el servicio de autenticación.",
};

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const authorization = await getAuthorization();
  const { reason } = await searchParams;
  // If Proxy could not verify the token, don't bounce back to the failing route
  // even if /user happens to respond successfully during a partial Auth outage.
  if (authorization.status === "authorized" && reason !== "unavailable") redirect("/");

  const notice = notices[authorization.status === "session" || authorization.status === "authorized"
    ? reason ?? "" : authorization.status];

  return (
    <main className="flex min-h-screen items-center justify-center px-8 py-12">
      <section aria-labelledby="login-title" className="w-full max-w-[440px] rounded-xl border border-border bg-surface p-10 shadow-sm">
        <span aria-hidden="true" className="mb-6 flex size-12 items-center justify-center rounded-lg bg-sidebar text-lg font-bold text-white">CT</span>
        <h1 id="login-title" className="text-2xl font-semibold tracking-tight">Control Total</h1>
        <p className="mt-2 text-sm text-muted">Sistema de Control y Monitoreo</p>
        {notice && <p role="status" className="mt-6 rounded-md bg-accent-soft p-3 text-sm leading-6">{notice}</p>}
        <LoginForm />
        {authorization.status === "denied" && <div className="mt-4"><LogoutForm /></div>}
        <p className="mt-7 border-t border-border pt-5 text-xs text-muted">Acceso exclusivo para el usuario autorizado.</p>
      </section>
    </main>
  );
}
