import Link from "next/link";
import { requireAuthorizedUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { ModuleIcon } from "@/components/layout/module-icon";
import { modules, navigationGroups, type ModuleId } from "@/lib/navigation";

const overview = [
  { module: "parametros", title: modules.parametros.title },
  { module: "camaras", title: modules.camaras.title },
  { module: "eventos", title: "Eventos activos" },
  { module: "diario", title: "Reportes" },
] as const satisfies ReadonlyArray<{ module: ModuleId; title: string }>;

export default async function HomePage() {
  await requireAuthorizedUser();
  return (
    <>
      <PageHeader title={modules.inicio.title} description="Control y Monitoreo de pisciculturas. Espacio de trabajo operacional." />

      <section aria-label="Resumen de módulos" className="mb-6 grid grid-cols-4 gap-4">
        {overview.map((item) => (
          <Link key={item.module} href={modules[item.module].href} className="rounded-lg border border-border bg-surface p-5 hover:border-accent">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium">{item.title}</span>
              <ModuleIcon module={item.module} className="size-5 text-accent" />
            </div>
            <p className="text-lg font-semibold tracking-tight">Sin datos</p>
            <p className="mt-2 text-xs leading-5 text-muted">Disponible cuando se habilite el módulo.</p>
          </Link>
        ))}
      </section>

      <section aria-labelledby="modulos-title" className="rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="modulos-title" className="text-sm font-semibold">Módulos del sistema</h2>
          <span className="text-xs text-muted">Control Total v2 · En desarrollo</span>
        </div>
        <div className="grid grid-cols-4 divide-x divide-border p-5">
          {navigationGroups.map((group) => (
            <div key={group.title} className="px-4 first:pl-0 last:pr-0">
              <h3 className="mb-3 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">{group.title}</h3>
              <ul className="space-y-3">
                {group.items.filter((id) => id !== "inicio").map((id) => (
                  <li key={id}><Link className="text-sm font-medium hover:text-accent hover:underline" href={modules[id].href}>{modules[id].title}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
