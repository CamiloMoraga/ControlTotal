"use client";

import { useActionState, useEffect, useRef } from "react";
import { savePiscicultura, type FormState } from "@/app/(app)/configuracion/actions";
import { PISCICULTURA_LIMITS } from "@/lib/pisciculturas/validation";
import type { PisciculturaRow } from "@/lib/pisciculturas/data";

const inputClass = "mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";
const initialFormState: FormState = { ok: null, message: "", errors: {} };

export function PisciculturaForm({ row, onClose, onResult }: {
  row: PisciculturaRow | null; onClose: () => void; onResult: (message: string, ok: boolean) => void;
}) {
  const [state, action, pending] = useActionState(savePiscicultura.bind(null, row?.id ?? null), initialFormState);
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
    ? <p id={`${field}-error`} className="mt-1 text-xs text-red-700">{state.errors[field]}</p> : null;

  return <section aria-labelledby="piscicultura-form-title" className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 id="piscicultura-form-title" className="text-base font-semibold">{row ? `Editar ${row.nombre}` : "Nueva piscicultura"}</h3>
      <button type="button" onClick={onClose} disabled={pending} className="rounded px-2 py-1 text-sm text-muted hover:text-foreground">Cerrar</button>
    </div>
    <form action={action} aria-busy={pending} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="nombre" className="text-sm font-medium">Nombre <span aria-hidden="true">*</span></label>
        <input ref={firstInput} id="nombre" name="nombre" required maxLength={PISCICULTURA_LIMITS.nombre}
          defaultValue={row?.nombre ?? ""} aria-invalid={!!state.errors.nombre} aria-describedby={state.errors.nombre ? "nombre-error" : undefined} className={inputClass} />
        {error("nombre")}
      </div>
      <div>
        <label htmlFor="codigo" className="text-sm font-medium">Código</label>
        <input id="codigo" name="codigo" maxLength={PISCICULTURA_LIMITS.codigo} pattern="[A-Za-z0-9_]*"
          autoCapitalize="characters" spellCheck={false} readOnly={!!row}
          defaultValue={row?.codigo ?? ""} aria-invalid={!!state.errors.codigo} aria-describedby={state.errors.codigo ? "codigo-error" : row ? "codigo-ayuda" : undefined}
          className={`${inputClass} uppercase read-only:bg-background read-only:text-muted`} />
        {row && <p id="codigo-ayuda" className="mt-1 text-xs text-muted">Código bloqueado para proteger referencias e integraciones existentes.</p>}
        {error("codigo")}
      </div>
      <div>
        <label htmlFor="orden" className="text-sm font-medium">Orden <span aria-hidden="true">*</span></label>
        <input id="orden" name="orden" type="number" min={0} max={PISCICULTURA_LIMITS.orden} step={1} required
          defaultValue={row?.orden ?? 0} aria-invalid={!!state.errors.orden} aria-describedby={state.errors.orden ? "orden-error" : undefined} className={inputClass} />
        {error("orden")}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="notaCamaras" className="text-sm font-medium">Nota de cámaras</label>
        <textarea id="notaCamaras" name="notaCamaras" rows={3} maxLength={PISCICULTURA_LIMITS.notaCamaras}
          defaultValue={row?.notaCamaras ?? ""} aria-invalid={!!state.errors.notaCamaras}
          aria-describedby={state.errors.notaCamaras ? "notaCamaras-error" : undefined} className={inputClass} />
        {error("notaCamaras")}
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Guardando…" : row ? "Guardar cambios" : "Crear piscicultura"}
        </button>
        <span role="status" aria-live="polite" className="text-sm text-muted">{pending ? "Procesando solicitud…" : ""}</span>
      </div>
    </form>
  </section>;
}
