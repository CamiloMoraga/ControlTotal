"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveParametro, type ParametroFormState } from "@/app/(app)/configuracion/parametro-actions";
import { PARAMETRO_LIMITS } from "@/lib/parametros/validation";
import type { ParametroRow } from "@/lib/parametros/data";

const inputClass = "mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";
const initialState: ParametroFormState = { ok: null, message: "", errors: {} };

export function ParametroForm({ row, onClose, onResult }: {
  row: ParametroRow | null; onClose: () => void; onResult: (message: string, ok: boolean) => void;
}) {
  const [state, action, pending] = useActionState(saveParametro.bind(null, row?.id ?? null), initialState);
  const firstInput = useRef<HTMLInputElement>(null);
  const notified = useRef(state);

  useEffect(() => { firstInput.current?.focus(); }, []);
  useEffect(() => {
    if (state !== notified.current) {
      notified.current = state;
      if (state.ok !== null) onResult(state.message, state.ok);
      if (state.ok) onClose();
    }
  }, [state, onClose, onResult]);

  const error = (field: keyof typeof state.errors) => state.errors[field]
    ? <p id={`parametro-${field}-error`} className="mt-1 text-xs text-red-700">{state.errors[field]}</p> : null;

  return <section aria-labelledby="parametro-form-title" className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 id="parametro-form-title" className="text-base font-semibold">{row ? `Editar ${row.nombre}` : "Nuevo parámetro"}</h3>
      <button type="button" onClick={onClose} disabled={pending} className="rounded px-2 py-1 text-sm text-muted hover:text-foreground">Cerrar</button>
    </div>
    <form action={action} aria-busy={pending} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="parametro-codigo" className="text-sm font-medium">Código <span aria-hidden="true">*</span></label>
        <input ref={firstInput} id="parametro-codigo" name="codigo" required maxLength={PARAMETRO_LIMITS.codigo} pattern="[A-Za-z0-9_]+"
          autoCapitalize="characters" spellCheck={false} readOnly={!!row} defaultValue={row?.codigo ?? ""}
          onBlur={(event) => { if (!row) event.currentTarget.value = event.currentTarget.value.trim().toUpperCase(); }}
          aria-invalid={!!state.errors.codigo} aria-describedby={state.errors.codigo ? "parametro-codigo-error" : row ? "parametro-codigo-ayuda" : undefined}
          className={`${inputClass} uppercase read-only:bg-background read-only:text-muted`} />
        {row && <p id="parametro-codigo-ayuda" className="mt-1 text-xs text-muted">El código queda bloqueado después de crear el parámetro.</p>}
        {error("codigo")}
      </div>
      <div>
        <label htmlFor="parametro-nombre" className="text-sm font-medium">Nombre <span aria-hidden="true">*</span></label>
        <input id="parametro-nombre" name="nombre" required maxLength={PARAMETRO_LIMITS.nombre} defaultValue={row?.nombre ?? ""}
          onBlur={(event) => { event.currentTarget.value = event.currentTarget.value.trim().replace(/\s+/gu, " "); }}
          aria-invalid={!!state.errors.nombre} aria-describedby={state.errors.nombre ? "parametro-nombre-error" : undefined} className={inputClass} />
        {error("nombre")}
      </div>
      <div>
        <label htmlFor="parametro-unidad" className="text-sm font-medium">Unidad</label>
        <input id="parametro-unidad" name="unidad" maxLength={PARAMETRO_LIMITS.unidad} defaultValue={row?.unidad ?? ""}
          aria-invalid={!!state.errors.unidad} aria-describedby={state.errors.unidad ? "parametro-unidad-error" : undefined} className={inputClass} />
        {error("unidad")}
      </div>
      <div>
        <label htmlFor="parametro-orden" className="text-sm font-medium">Orden <span aria-hidden="true">*</span></label>
        <input id="parametro-orden" name="orden" type="number" min={0} max={PARAMETRO_LIMITS.orden} step={1} required
          defaultValue={row?.orden ?? 0} aria-invalid={!!state.errors.orden}
          aria-describedby={state.errors.orden ? "parametro-orden-error" : undefined} className={inputClass} />
        {error("orden")}
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Guardando…" : row ? "Guardar cambios" : "Crear parámetro"}
        </button>
        <span role="status" aria-live="polite" className="text-sm text-muted">{pending ? "Procesando solicitud…" : ""}</span>
      </div>
    </form>
  </section>;
}
