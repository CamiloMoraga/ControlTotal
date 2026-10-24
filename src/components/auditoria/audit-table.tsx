import Link from "next/link";
import type { AuditPage } from "@/lib/auditoria/query";
import { auditHref, AUDIT_PAGE_SIZE, type AuditSearch } from "@/lib/auditoria/search";
import { formatAuditDate } from "./audit-detail";

export function AuditTable({ result, search }: { result: AuditPage; search: AuditSearch }) {
  const first = (search.page - 1) * AUDIT_PAGE_SIZE + 1;
  const last = Math.min(search.page * AUDIT_PAGE_SIZE, result.total);
  return <section aria-labelledby="audit-table-title" className="rounded-lg border border-border bg-surface">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
      <h2 id="audit-table-title" className="text-sm font-semibold">Registros de auditoría</h2>
      <p className="text-xs text-muted">{result.total} coincidentes{result.total > 0 && !result.outOfRange ? ` · Mostrando ${first}–${last}` : ""}</p>
    </div>
    {result.outOfRange ? <p role="alert" className="px-5 py-8 text-sm text-red-800">La página solicitada excede los resultados. <Link href={auditHref(search.filters)} className="font-medium underline">Volver a la primera página</Link>.</p> :
      result.rows.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">No hay registros para los filtros seleccionados.</p> :
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-background text-xs text-muted"><tr>
          {(["Fecha y hora", "Usuario", "Módulo", "Acción", "Entidad", "Identificador de entidad", "Detalle"] as const)
            .map((title) => <th key={title} scope="col" className="px-4 py-3 font-semibold">{title}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-border">{result.rows.map((row) => <tr key={row.id}>
          <td className="whitespace-nowrap px-4 py-3">{formatAuditDate(row.fecha)}</td>
          <td className="max-w-48 break-all px-4 py-3">{row.actorEmail ?? "—"}</td>
          <td className="px-4 py-3">{row.modulo}</td>
          <td className="px-4 py-3"><span className="rounded bg-accent-soft px-2 py-1 text-xs font-medium text-accent">{row.accion}</span></td>
          <td className="px-4 py-3">{row.entidad}</td>
          <td className="max-w-48 break-all px-4 py-3 text-xs text-muted">{row.entidadId ?? "—"}</td>
          <td className="px-4 py-3"><Link href={auditHref(search.filters, search.page, row.id)} aria-label={`Ver detalle del registro ${row.id}`} className="font-medium text-accent hover:underline">Ver detalle</Link></td>
        </tr>)}</tbody>
      </table></div>}
    <nav aria-label="Paginación de auditoría" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm">
      <span className="text-muted">Página {search.page} de {result.totalPages}</span>
      <div className="flex gap-2">
        {search.page > 1 && !result.outOfRange ? <Link href={auditHref(search.filters, search.page - 1)} className="rounded-md border border-border px-3 py-2 hover:bg-background">Anterior</Link> : <span className="rounded-md border border-border px-3 py-2 text-muted opacity-50">Anterior</span>}
        {search.page < result.totalPages && !result.outOfRange ? <Link href={auditHref(search.filters, search.page + 1)} className="rounded-md border border-border px-3 py-2 hover:bg-background">Siguiente</Link> : <span className="rounded-md border border-border px-3 py-2 text-muted opacity-50">Siguiente</span>}
      </div>
    </nav>
  </section>;
}
