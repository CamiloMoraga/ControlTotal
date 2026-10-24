export const AUDIT_PAGE_SIZE = 25;
export const AUDIT_MAX_PAGE = 100000;

export type AuditSearchParams = Record<string, string | string[] | undefined>;
export type AuditFilters = {
  desde?: string;
  hasta?: string;
  modulo?: string;
  accion?: string;
  entidad?: string;
  usuario?: string;
};
export type AuditSearch = { filters: AuditFilters; page: number; detailId?: string };
export type AuditSearchResult = { search: AuditSearch; values: Record<keyof AuditFilters | "page" | "detalle", string>; errors: Record<string, string>; valid: boolean };

const fields = ["desde", "hasta", "modulo", "accion", "entidad", "usuario", "page", "detalle"] as const;
const textLimits = { modulo: 80, accion: 80, entidad: 80, usuario: 254 } as const;

function validDate(value: string) {
  if (!/^(19|20|21)\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

export function parseAuditSearch(params: AuditSearchParams): AuditSearchResult {
  const errors: Record<string, string> = {};
  const values = Object.fromEntries(fields.map((field) => {
    const raw = params[field];
    if (Array.isArray(raw)) errors[field] = "Indica un solo valor.";
    return [field, typeof raw === "string" ? raw.trim() : ""];
  })) as AuditSearchResult["values"];
  const filters: AuditFilters = {};
  for (const field of ["desde", "hasta"] as const) {
    if (values[field]) {
      if (!validDate(values[field])) errors[field] = "Ingresa una fecha válida entre 1900 y 2199.";
      else filters[field] = values[field];
    }
  }
  if (filters.desde && filters.hasta && filters.desde > filters.hasta) {
    errors.hasta = "La fecha final debe ser igual o posterior a la inicial.";
  }
  for (const field of ["modulo", "accion", "entidad", "usuario"] as const) {
    if (values[field]) {
      if (values[field].length > textLimits[field] || /[\x00-\x1f\x7f]/.test(values[field])) {
        errors[field] = `Usa hasta ${textLimits[field]} caracteres de texto.`;
      } else if (field === "usuario" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[field])) {
        errors[field] = "Ingresa un correo válido.";
      } else filters[field] = field === "usuario" ? values[field].toLowerCase() : values[field];
    }
  }
  const page = values.page || "1";
  if (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page)) || Number(page) > AUDIT_MAX_PAGE) {
    errors.page = `La página debe estar entre 1 y ${AUDIT_MAX_PAGE}.`;
  }
  if (values.detalle && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(values.detalle)) {
    errors.detalle = "El identificador del detalle no es válido.";
  }
  return {
    search: { filters, page: errors.page ? 1 : Number(page), detailId: errors.detalle ? undefined : values.detalle || undefined },
    values, errors, valid: Object.keys(errors).length === 0,
  };
}

export function auditHref(filters: AuditFilters, page = 1, detailId?: string) {
  const params = new URLSearchParams();
  for (const field of ["desde", "hasta", "modulo", "accion", "entidad", "usuario"] as const) {
    if (filters[field]) params.set(field, filters[field]);
  }
  if (page > 1) params.set("page", String(page));
  if (detailId) params.set("detalle", detailId);
  const query = params.toString();
  return `/auditoria${query ? `?${query}` : ""}${detailId ? "#detalle" : ""}`;
}

const localDateParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
});

function localDateKey(instant: number) {
  const parts = Object.fromEntries(localDateParts.formatToParts(new Date(instant))
    .filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Primer instante UTC del día civil chileno; sirve también si un cambio de horario
// omite la medianoche local. El rango UTC se usa en Prisma sin alterar la BD.
export function startOfSantiagoDay(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const center = Date.UTC(year, month - 1, day);
  let low = center - 18 * 60 * 60 * 1000;
  let high = center + 18 * 60 * 60 * 1000;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (localDateKey(mid) < isoDate) low = mid + 1;
    else high = mid;
  }
  return new Date(low);
}

export function nextIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}
