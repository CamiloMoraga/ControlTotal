import { PageHeader } from "@/components/layout/page-header";
import { ModuleIcon } from "@/components/layout/module-icon";
import { modules, type ModuleId } from "@/lib/navigation";

export function ModulePlaceholder({ module }: { module: Exclude<ModuleId, "inicio"> }) {
  const item = modules[module];

  return (
    <>
      <PageHeader title={item.title} description={item.description} />
      <section aria-label={`Estado de ${item.title}`} className="rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm font-medium">Estado del módulo</span>
          <span className="rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted">Pendiente de habilitar</span>
        </div>
        <div className="flex items-start gap-4 px-5 py-8">
          <span className="rounded-lg bg-accent-soft p-3 text-accent"><ModuleIcon module={module} /></span>
          <div>
            <h2 className="text-sm font-semibold">Sin datos</h2>
            <p className="mt-1.5 text-sm text-muted">Disponible cuando se habilite el módulo.</p>
          </div>
        </div>
      </section>
    </>
  );
}
