"use client";

import { useCallback, useState, useTransition } from "react";
import { changeParametroState } from "@/app/(app)/configuracion/parametro-actions";
import type { ParametroRow } from "@/lib/parametros/data";
import { filterParametros, type ParametroFilter } from "@/lib/parametros/filters";
import { ParametroForm } from "./parametro-form";

export function ParametroList({ rows }: { rows: ParametroRow[] }) {
  const [filter, setFilter] = useState<ParametroFilter>("todos");
  const [editing, setEditing] = useState<string | null | "new">(null);
  const [notice, setNotice] = useState<{ message: string; ok: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setEditing(null), []);
  const onResult = useCallback((message: string, ok: boolean) => setNotice({ message, ok }), []);
  const shown = filterParametros(rows, filter);
  const selected = editing && editing !== "new" ? rows.find((row) => row.id === editing) ?? null : null;

  function changeState(row: ParametroRow) {
    if (pending || busyId) return;
    if (row.activo && !window.confirm(`¿Desactivar ${row.nombre}? Sus mediciones y eventos históricos se conservarán.`)) return;
    setBusyId(row.id);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await changeParametroState(row.id, !row.activo);
        setNotice(result);
      } catch {
        setNotice({ ok: false, message: "No se pudo actualizar el estado. Inténtalo nuevamente." });
      } finally {
        setBusyId(null);
      }
    });
  }

  return <section aria-labelledby="parametros-title" className="space-y-5">
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="parametros-title" className="text-lg font-semibold">Parámetros</h2>
          <p className="mt-1 text-sm text-muted">Administra el catálogo y conserva mediciones y eventos al desactivar registros.</p>
        </div>
        <button type="button" onClick={() => { setEditing("new"); setNotice(null); }}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Nuevo parámetro</button>
      </div>
    </div>

    {notice && <div role={notice.ok ? "status" : "alert"} className={`rounded-md border px-4 py-3 text-sm ${notice.ok ? "border-teal-200 bg-accent-soft text-accent" : "border-red-200 bg-red-50 text-red-800"}`}>{notice.message}</div>}
    {editing && <ParametroForm key={editing} row={selected} onClose={close} onResult={onResult} />}

    <div className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Registros <span className="font-normal text-muted">({shown.length})</span></h3>
        <div className="flex items-center gap-2">
          <label htmlFor="filtro-parametros" className="text-sm text-muted">Estado</label>
          <select id="filtro-parametros" value={filter} onChange={(event) => setFilter(event.target.value as ParametroFilter)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
            <option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option>
          </select>
        </div>
      </div>
      {shown.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">{rows.length ? "No hay parámetros para este filtro." : "Aún no hay parámetros. Crea el primero para comenzar."}</p> :
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-background text-xs text-muted"><tr>
              <th scope="col" className="px-5 py-3 font-semibold">Código</th><th scope="col" className="px-5 py-3 font-semibold">Nombre</th>
              <th scope="col" className="px-5 py-3 font-semibold">Unidad</th><th scope="col" className="px-5 py-3 font-semibold">Orden</th>
              <th scope="col" className="px-5 py-3 font-semibold">Estado</th><th scope="col" className="px-5 py-3 text-right font-semibold">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-border">{shown.map((row) => <tr key={row.id}>
              <td className="px-5 py-3 font-medium">{row.codigo}</td>
              <td className="px-5 py-3">{row.nombre}</td>
              <td className="px-5 py-3 text-muted">{row.unidad ?? "—"}</td>
              <td className="px-5 py-3 tabular-nums">{row.orden}</td>
              <td className="px-5 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${row.activo ? "bg-accent-soft text-accent" : "bg-background text-muted"}`}>{row.activo ? "Activo" : "Inactivo"}</span></td>
              <td className="space-x-3 whitespace-nowrap px-5 py-3 text-right">
                <button type="button" onClick={() => { setEditing(row.id); setNotice(null); }} className="font-medium text-accent hover:underline">Editar</button>
                <button type="button" disabled={pending || !!busyId} onClick={() => changeState(row)}
                  className="font-medium text-foreground hover:underline disabled:cursor-wait disabled:opacity-50">
                  {busyId === row.id ? "Procesando…" : row.activo ? "Desactivar" : "Activar"}
                </button>
              </td>
            </tr>)}</tbody>
          </table>
        </div>}
    </div>
  </section>;
}
