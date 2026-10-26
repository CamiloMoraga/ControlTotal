"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveEventCatalog, type CatalogFormState } from "@/app/(app)/configuracion/event-catalog-actions";
import { CATALOGS, NAME_LIMIT, ORDER_LIMIT, type CatalogKind } from "@/lib/event-catalogs/validation";
import type { CatalogRow } from "@/lib/event-catalogs/query";

type Motivo = { id: string; nombre: string; activo: boolean };
const initial: CatalogFormState = { ok: null, message: "", errors: {} };
const inputClass = "mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export function EventCatalogForm({ kind, row, motivos, onClose, onResult }: {
  kind: CatalogKind; row: CatalogRow | null; motivos: Motivo[]; onClose: () => void;
  onResult: (message: string, ok: boolean) => void;
}) {
  const [state, action, pending] = useActionState(saveEventCatalog.bind(null, kind, row?.id ?? null), initial);
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
    ? <p id={`event-${field}-error`} className="mt-1 text-xs text-red-700">{state.errors[field]}</p> : null;

  return <section aria-labelledby="event-form-title" className="rounded-lg border border-border bg-surface p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 id="event-form-title" className="text-base font-semibold">{row ? `Editar ${row.nombre}` : `Nuevo ${CATALOGS[kind].singular.toLowerCase()}`}</h3>
      <button type="button" onClick={onClose} disabled={pending} className="rounded px-2 py-1 text-sm text-muted hover:text-foreground">Cerrar</button>
    </div>
    <form action={action} aria-busy={pending} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="event-nombre" className="text-sm font-medium">Nombre <span aria-hidden="true">*</span></label>
        <input ref={firstInput} id="event-nombre" name="nombre" required maxLength={NAME_LIMIT} defaultValue={row?.nombre ?? ""}
          onBlur={(event) => { event.currentTarget.value = event.currentTarget.value.trim().replace(/\s+/gu, " "); }}
          aria-invalid={!!state.errors.nombre} aria-describedby={state.errors.nombre ? "event-nombre-error" : undefined} className={inputClass} />
        {error("nombre")}
      </div>
      <div>
        <label htmlFor="event-orden" className="text-sm font-medium">Orden <span aria-hidden="true">*</span></label>
        <input id="event-orden" name="orden" type="number" min={0} max={ORDER_LIMIT} step={1} required defaultValue={row?.orden ?? 0}
          aria-invalid={!!state.errors.orden} aria-describedby={state.errors.orden ? "event-orden-error" : undefined} className={inputClass} />
        {error("orden")}
      </div>
      {kind === "submotivos" && <div className="sm:col-span-2">
        <label htmlFor="event-motivo" className="text-sm font-medium">Motivo padre <span aria-hidden="true">*</span></label>
        <select id="event-motivo" name="motivoId" required defaultValue={row?.motivoId ?? ""}
          aria-invalid={!!state.errors.motivoId} aria-describedby={state.errors.motivoId ? "event-motivoId-error" : undefined} className={inputClass}>
          <option value="">Selecciona un motivo</option>
          {motivos.filter((motivo) => motivo.activo || motivo.id === row?.motivoId).map((motivo) =>
            <option key={motivo.id} value={motivo.id}>{motivo.nombre}{motivo.activo ? "" : " (inactivo)"}</option>)}
        </select>
        {error("motivoId")}
        {row && <p className="mt-1 text-xs text-muted">Sólo se puede cambiar el motivo si este submotivo no tiene eventos.</p>}
      </div>}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending || (kind === "submotivos" && !row && !motivos.some((motivo) => motivo.activo))}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Guardando…" : row ? "Guardar cambios" : "Crear registro"}
        </button>
        <span role="status" aria-live="polite" className="text-sm text-muted">{pending ? "Procesando solicitud…" : ""}</span>
      </div>
      {kind === "submotivos" && !row && !motivos.some((motivo) => motivo.activo) &&
        <p className="text-sm text-muted sm:col-span-2">Crea o activa un motivo antes de agregar submotivos.</p>}
    </form>
  </section>;
}
