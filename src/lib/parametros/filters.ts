export type ParametroFilter = "todos" | "activos" | "inactivos";

export function filterParametros<T extends { activo: boolean }>(rows: T[], filter: ParametroFilter): T[] {
  return rows.filter((row) => filter === "todos" || row.activo === (filter === "activos"));
}
