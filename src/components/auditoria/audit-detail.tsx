import Link from "next/link";
import type { AuditDetail } from "@/lib/auditoria/query";
import { auditHref, type AuditSearch } from "@/lib/auditoria/search";
import { compareSnapshots, jsonText } from "@/lib/auditoria/snapshots";

export function formatAuditDate(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "short",
  }).format(date);
}

const labels = { added: "Agregado", removed: "Eliminado", changed: "Modificado", unchanged: "Sin cambios" } as const;
const tones = { added: "bg-emerald-50 text-emerald-800", removed: "bg-red-50 text-red-800",
  changed: "bg-amber-50 text-amber-800", unchanged: "bg-background text-muted" } as const;

function Snapshot({ title, value }: { title: string; value: unknown }) {
  return <div className="min-w-0">
    <h4 className="mb-2 text-sm font-semibold">{title}</h4>
    <pre className="max-h-80 overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-5 whitespace-pre-wrap break-all">{jsonText(value)}</pre>
  </div>;
}

export function AuditDetailPanel({ record, search }: { record: AuditDetail; search: AuditSearch }) {
  const changes = compareSnapshots(record.antes, record.despues);
  return <section id="detalle" role="region" aria-labelledby="audit-detail-title" tabIndex={-1}
    className="rounded-lg border border-border bg-surface p-5 outline-none focus-visible:outline-2">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="audit-detail-title" className="text-lg font-semibold">Detalle del registro</h2>
        <p className="mt-1 text-xs text-muted">Solo lectura · {record.id}</p>
      </div>
      <Link href={auditHref(search.filters, search.page)} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-background">Cerrar detalle</Link>
    </div>
    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {([
        ["Fecha y hora", formatAuditDate(record.fecha)], ["Usuario", record.actorEmail ?? "Sin usuario"],
        ["Módulo", record.modulo], ["Acción", record.accion], ["Entidad", record.entidad],
        ["Identificador de entidad", record.entidadId ?? "Sin identificador"],
      ] as const).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-medium text-muted">{label}</dt><dd className="mt-1 break-all">{value}</dd></div>)}
    </dl>
    <div className="mt-6 grid gap-4 border-t border-border pt-5 lg:grid-cols-2">
      <Snapshot title="Estado anterior" value={record.antes} />
      <Snapshot title="Estado posterior" value={record.despues} />
    </div>
    {changes && <div className="mt-6 border-t border-border pt-5">
      <h3 className="text-sm font-semibold">Comparación de campos</h3>
      {changes.length === 0 ? <p className="mt-2 text-sm text-muted">Ambos objetos están vacíos.</p> :
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-background text-xs text-muted"><tr><th scope="col" className="px-3 py-2">Campo</th><th scope="col" className="px-3 py-2">Cambio</th><th scope="col" className="px-3 py-2">Antes</th><th scope="col" className="px-3 py-2">Después</th></tr></thead>
          <tbody className="divide-y divide-border">{changes.map((change) => <tr key={change.field}>
            <th scope="row" className="px-3 py-2 font-medium break-all">{change.field}</th>
            <td className="px-3 py-2"><span className={`rounded px-2 py-1 text-xs ${tones[change.kind]}`}>{labels[change.kind]}</span></td>
            <td className="px-3 py-2"><pre className="max-w-64 whitespace-pre-wrap break-all">{change.kind === "added" ? "No existe" : jsonText(change.before)}</pre></td>
            <td className="px-3 py-2"><pre className="max-w-64 whitespace-pre-wrap break-all">{change.kind === "removed" ? "No existe" : jsonText(change.after)}</pre></td>
          </tr>)}</tbody>
        </table></div>}
    </div>}
  </section>;
}
