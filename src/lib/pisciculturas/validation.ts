// Límites compartidos por el formulario y el servidor. Int de PostgreSQL/Prisma: 0..2^31-1.
export const PISCICULTURA_LIMITS = { nombre: 120, codigo: 40, notaCamaras: 2000, orden: 2147483647 } as const;

export type PisciculturaInput = { nombre: string; codigo: string | null; orden: number; notaCamaras: string | null };
export type PisciculturaField = keyof PisciculturaInput;
export type FieldErrors = Partial<Record<PisciculturaField, string>>;

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function nameKey(value: string) {
  return normalizeName(value).toLocaleLowerCase("es");
}

export function validatePiscicultura(form: FormData): { data?: PisciculturaInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const raw = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : null;
  };
  const nombre = normalizeName(raw("nombre") ?? "");
  const rawCodigo = (raw("codigo") ?? "").trim();
  const codigo = rawCodigo.toUpperCase() || null;
  const ordenText = raw("orden")?.trim() ?? "";
  const orden = /^\d+$/.test(ordenText) ? Number(ordenText) : NaN;
  const notaCamaras = (raw("notaCamaras") ?? "").trim() || null;

  if (!nombre) errors.nombre = "Ingresa un nombre.";
  else if (nombre.length > PISCICULTURA_LIMITS.nombre) errors.nombre = `Máximo ${PISCICULTURA_LIMITS.nombre} caracteres.`;
  if (codigo && (!/^[A-Za-z0-9_]+$/.test(rawCodigo) || codigo.length > PISCICULTURA_LIMITS.codigo)) {
    errors.codigo = `Usa hasta ${PISCICULTURA_LIMITS.codigo} letras ASCII, números o guiones bajos.`;
  }
  if (!Number.isSafeInteger(orden) || orden < 0 || orden > PISCICULTURA_LIMITS.orden) {
    errors.orden = `Ingresa un entero entre 0 y ${PISCICULTURA_LIMITS.orden}.`;
  }
  if (notaCamaras && notaCamaras.length > PISCICULTURA_LIMITS.notaCamaras) {
    errors.notaCamaras = `Máximo ${PISCICULTURA_LIMITS.notaCamaras} caracteres.`;
  }
  return Object.keys(errors).length ? { errors } : { data: { nombre, codigo, orden, notaCamaras }, errors };
}
