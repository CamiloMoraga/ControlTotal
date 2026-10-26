export const CATALOGS = {
  categorias: { label: "Categorías", singular: "Categoría", entity: "categoria_evento" },
  condiciones: { label: "Condiciones", singular: "Condición", entity: "condicion_evento" },
  areas: { label: "Áreas operacionales", singular: "Área operacional", entity: "area_operacional" },
  motivos: { label: "Motivos", singular: "Motivo", entity: "motivo_evento" },
  submotivos: { label: "Submotivos", singular: "Submotivo", entity: "submotivo_evento" },
} as const;

export type CatalogKind = keyof typeof CATALOGS;
export type CatalogInput = { nombre: string; orden: number; motivoId?: string };
export type FieldErrors = Partial<Record<"nombre" | "orden" | "motivoId", string>>;
export const NAME_LIMIT = 120;
export const ORDER_LIMIT = 2147483647;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validKind(kind: string): kind is CatalogKind { return Object.hasOwn(CATALOGS, kind); }
export function normalizeName(value: string) { return value.trim().replace(/\s+/gu, " "); }
export function nameKey(value: string) { return normalizeName(value).toLocaleLowerCase("es"); }

export function validateCatalog(kind: CatalogKind, form: FormData): { data?: CatalogInput; errors: FieldErrors } {
  const read = (key: string) => { const value = form.get(key); return typeof value === "string" ? value : ""; };
  const nombre = normalizeName(read("nombre"));
  const text = read("orden").trim();
  const orden = /^\d+$/.test(text) ? Number(text) : NaN;
  const motivoId = read("motivoId").trim();
  const errors: FieldErrors = {};
  if (!nombre) errors.nombre = "Ingresa un nombre.";
  else if (nombre.length > NAME_LIMIT) errors.nombre = `Máximo ${NAME_LIMIT} caracteres.`;
  if (!Number.isSafeInteger(orden) || orden < 0 || orden > ORDER_LIMIT) errors.orden = `Ingresa un entero entre 0 y ${ORDER_LIMIT}.`;
  if (kind === "submotivos" && !UUID_PATTERN.test(motivoId)) errors.motivoId = "Selecciona un motivo válido.";
  return Object.keys(errors).length ? { errors } : { data: { nombre, orden, ...(kind === "submotivos" ? { motivoId } : {}) }, errors };
}
