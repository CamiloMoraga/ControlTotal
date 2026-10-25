export const PARAMETRO_LIMITS = { codigo: 40, nombre: 120, unidad: 40, orden: 2147483647 } as const;

export type ParametroInput = { codigo: string; nombre: string; unidad: string | null; orden: number };
export type ParametroField = keyof ParametroInput;
export type FieldErrors = Partial<Record<ParametroField, string>>;

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function nameKey(value: string) {
  return normalizeName(value).toLocaleLowerCase("es");
}

export function validateParametro(form: FormData): { data?: ParametroInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const raw = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : null;
  };
  const rawCodigo = (raw("codigo") ?? "").trim();
  const codigo = rawCodigo.toUpperCase();
  const nombre = normalizeName(raw("nombre") ?? "");
  const unidad = (raw("unidad") ?? "").trim() || null;
  const ordenText = raw("orden")?.trim() ?? "0";
  const orden = /^\d+$/.test(ordenText) ? Number(ordenText) : NaN;

  if (!codigo) errors.codigo = "Ingresa un código.";
  else if (!/^[A-Za-z0-9_]+$/.test(rawCodigo) || codigo.length > PARAMETRO_LIMITS.codigo) {
    errors.codigo = `Usa hasta ${PARAMETRO_LIMITS.codigo} letras ASCII, números o guiones bajos.`;
  }
  if (!nombre) errors.nombre = "Ingresa un nombre.";
  else if (nombre.length > PARAMETRO_LIMITS.nombre) errors.nombre = `Máximo ${PARAMETRO_LIMITS.nombre} caracteres.`;
  if (unidad && unidad.length > PARAMETRO_LIMITS.unidad) errors.unidad = `Máximo ${PARAMETRO_LIMITS.unidad} caracteres.`;
  if (!Number.isSafeInteger(orden) || orden < 0 || orden > PARAMETRO_LIMITS.orden) {
    errors.orden = `Ingresa un entero entre 0 y ${PARAMETRO_LIMITS.orden}.`;
  }
  return Object.keys(errors).length ? { errors } : { data: { codigo, nombre, unidad, orden }, errors };
}
