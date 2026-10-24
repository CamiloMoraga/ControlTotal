import Link from "next/link";
import { requireAuthorizedUser } from "@/lib/auth";
import { modules } from "@/lib/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { listPisciculturas } from "@/lib/pisciculturas/data";
import { PisciculturaList } from "@/components/configuracion/piscicultura-list";
import { listParametros } from "@/lib/parametros/data";
import { ParametroList } from "@/components/configuracion/parametro-list";

export const metadata = { title: `${modules.configuracion.title} | Control Total` };

export default async function Page({ searchParams }: { searchParams: Promise<{ seccion?: string }> }) {
  await requireAuthorizedUser();
  const seccion = (await searchParams).seccion;
  const selected = seccion === "parametros" || seccion === "eventos" ? seccion : "pisciculturas";
  const rows = selected === "pisciculturas" ? await listPisciculturas() : null;
  const parametros = selected === "parametros" ? await listParametros() : null;
  return <>
    <PageHeader title={modules.configuracion.title} description={modules.configuracion.description} />
    <nav aria-label="Secciones de configuración" className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
      {([
        ["pisciculturas", "Pisciculturas", "/configuracion"],
        ["parametros", "Parámetros", "/configuracion?seccion=parametros"],
        ["eventos", "Catálogos de Eventos", "/configuracion?seccion=eventos"],
      ] as const).map(([key, label, href]) => <Link key={key} href={href} aria-current={selected === key ? "page" : undefined}
        className={`rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent ${selected === key ? "bg-accent text-white" : "text-muted hover:bg-surface hover:text-foreground"}`}>
        {label}</Link>)}
    </nav>
    {rows && <PisciculturaList rows={rows} />}
    {parametros && <ParametroList rows={parametros} />}
    {selected === "eventos" && <section aria-labelledby="eventos-title" className="rounded-lg border border-border bg-surface p-5">
      <h2 id="eventos-title" className="text-lg font-semibold">Catálogos de Eventos</h2>
      <p className="mt-2 text-sm text-muted">Administración pendiente del Bloque 4.2.</p>
    </section>}
  </>;
}
