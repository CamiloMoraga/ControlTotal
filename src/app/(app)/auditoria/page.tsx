import Link from "next/link";
import { requireAuthorizedUser } from "@/lib/auth";
import { modules } from "@/lib/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { parseAuditSearch, auditHref, type AuditSearchParams } from "@/lib/auditoria/search";
import { getAuditDetail, listAuditRecords } from "@/lib/auditoria/data";
import { AuditFiltersForm } from "@/components/auditoria/audit-filters";
import { AuditTable } from "@/components/auditoria/audit-table";
import { AuditDetailPanel } from "@/components/auditoria/audit-detail";

export const metadata = { title: `${modules.auditoria.title} | Control Total` };

export default async function Page({ searchParams }: { searchParams: Promise<AuditSearchParams> }) {
  await requireAuthorizedUser();
  const parsed = parseAuditSearch(await searchParams);
  if (!parsed.valid) return <>
    <PageHeader title={modules.auditoria.title} description={modules.auditoria.description} />
    <AuditFiltersForm parsed={parsed} />
    <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      Revisa los filtros indicados{parsed.errors.page && `: ${parsed.errors.page}`}{parsed.errors.detalle && `: ${parsed.errors.detalle}`}.
    </p>
  </>;

  const result = await listAuditRecords(parsed.search);
  const detail = parsed.search.detailId ? await getAuditDetail(parsed.search.detailId) : null;
  return <>
    <PageHeader title={modules.auditoria.title} description={modules.auditoria.description} />
    <div className="space-y-5">
      <AuditFiltersForm parsed={parsed} />
      {parsed.search.detailId && (detail
        ? <AuditDetailPanel record={detail} search={parsed.search} />
        : <p id="detalle" role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">El registro solicitado no existe. <Link href={auditHref(parsed.search.filters, parsed.search.page)} className="underline">Cerrar detalle</Link>.</p>)}
      <AuditTable result={result} search={parsed.search} />
    </div>
  </>;
}
