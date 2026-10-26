import type { CatalogRow } from "./query";

export function filterCatalog(rows: CatalogRow[], state: string, motivoId?: string) {
  return rows.filter((row) => (state === "todos" || row.activo === (state === "activos"))
    && (!motivoId || row.motivoId === motivoId));
}
