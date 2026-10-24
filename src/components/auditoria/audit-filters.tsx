import Link from "next/link";
import type { AuditSearchResult } from "@/lib/auditoria/search";

const inputClass = "mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export function AuditFiltersForm({ parsed }: { parsed: AuditSearchResult }) {
  const textFields = [
    { name: "modulo", label: "Módulo", example: "configuracion" },
    { name: "accion", label: "Acción", example: "CREATE" },
    { name: "entidad", label: "Entidad", example: "piscicultura" },
    { name: "usuario", label: "Correo del usuario", example: "usuario@empresa.cl" },
  ] as const;
  return <section aria-labelledby="audit-filters-title" className="rounded-lg border border-border bg-surface p-5">
    <h2 id="audit-filters-title" className="text-sm font-semibold">Filtros</h2>
    <p className="mt-1 text-xs text-muted">Módulo, acción, entidad y correo se buscan por valor exacto. Las fechas corresponden a America/Santiago.</p>
    <form method="get" action="/auditoria" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(["desde", "hasta"] as const).map((field) => <div key={field}>
        <label htmlFor={`audit-${field}`} className="text-sm font-medium">{field === "desde" ? "Fecha inicial" : "Fecha final"}</label>
        <input id={`audit-${field}`} name={field} type="date" min="1900-01-01" max="2199-12-31"
          defaultValue={parsed.values[field]} aria-invalid={!!parsed.errors[field]}
          aria-describedby={parsed.errors[field] ? `audit-${field}-error` : undefined} className={inputClass} />
        {parsed.errors[field] && <p id={`audit-${field}-error`} className="mt-1 text-xs text-red-700">{parsed.errors[field]}</p>}
      </div>)}
      {textFields.map(({ name, label, example }) => <div key={name}>
        <label htmlFor={`audit-${name}`} className="text-sm font-medium">{label}</label>
        <input id={`audit-${name}`} name={name} type={name === "usuario" ? "email" : "text"}
          placeholder={example} maxLength={name === "usuario" ? 254 : 80}
          defaultValue={parsed.values[name]} aria-invalid={!!parsed.errors[name]}
          aria-describedby={parsed.errors[name] ? `audit-${name}-error` : undefined} className={inputClass} />
        {parsed.errors[name] && <p id={`audit-${name}-error`} className="mt-1 text-xs text-red-700">{parsed.errors[name]}</p>}
      </div>)}
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Aplicar filtros</button>
        <Link href="/auditoria" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-background">Limpiar</Link>
      </div>
    </form>
  </section>;
}
