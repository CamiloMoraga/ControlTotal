import Link from "next/link";
import { requireAuthorizedUser } from "@/lib/auth";
import { modules } from "@/lib/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { listPisciculturas } from "@/lib/pisciculturas/data";
import { PisciculturaList } from "@/components/configuracion/piscicultura-list";
import { listParametros } from "@/lib/parametros/data";
import { ParametroList } from "@/components/configuracion/parametro-list";
import { EventCatalogList } from "@/components/configuracion/event-catalog-list";
import { listCatalog, listMotivosForCatalog } from "@/lib/event-catalogs/data";
import { validKind } from "@/lib/event-catalogs/validation";

export const metadata = { title: `${modules.configuracion.title} | Control Total` };

export default async function Page({ searchParams }: { searchParams: Promise<{ seccion?: string; catalogo?: string }> }) {
  await requireAuthorizedUser();
  const params = await searchParams;
  const seccion = params.seccion;
  const selected = seccion === "parametros" || seccion === "eventos" ? seccion : "pisciculturas";
  const catalogo = typeof params.catalogo === "string" && validKind(params.catalogo) ? params.catalogo : "categorias";
  const rows = selected === "pisciculturas" ? await listPisciculturas() : null;
  const parametros = selected === "parametros" ? await listParametros() : null;
  const eventRows = selected === "eventos" ? await listCatalog(catalogo) : null;
  const motivos = selected === "eventos" && catalogo === "submotivos" ? await listMotivosForCatalog() : [];
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
    {eventRows && <EventCatalogList key={catalogo} kind={catalogo} rows={eventRows} motivos={motivos} />}
  </>;
}
