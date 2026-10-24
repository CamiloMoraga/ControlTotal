import { requireAuthorizedUser } from "@/lib/auth";
import { modules } from "@/lib/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { listPisciculturas } from "@/lib/pisciculturas/data";
import { PisciculturaList } from "@/components/configuracion/piscicultura-list";

export const metadata = { title: `${modules.configuracion.title} | Control Total` };

export default async function Page() {
  await requireAuthorizedUser();
  const rows = await listPisciculturas();
  return <>
    <PageHeader title={modules.configuracion.title} description={modules.configuracion.description} />
    <PisciculturaList rows={rows} />
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <section className="rounded-lg border border-border bg-surface p-5" aria-label="Parámetros">
        <h2 className="text-sm font-semibold">Parámetros</h2><p className="mt-2 text-sm text-muted">Administración disponible en un próximo bloque.</p>
      </section>
      <section className="rounded-lg border border-border bg-surface p-5" aria-label="Catálogos de eventos">
        <h2 className="text-sm font-semibold">Catálogos de eventos</h2><p className="mt-2 text-sm text-muted">Administración disponible en un próximo bloque.</p>
      </section>
    </div>
  </>;
}
