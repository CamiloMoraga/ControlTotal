"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { changeEventCatalogState } from "@/app/(app)/configuracion/event-catalog-actions";
import { CATALOGS, type CatalogKind } from "@/lib/event-catalogs/validation";
import type { CatalogRow } from "@/lib/event-catalogs/query";
import { filterCatalog } from "@/lib/event-catalogs/filters";
import { EventCatalogForm } from "./event-catalog-form";

type Motivo = { id: string; nombre: string; activo: boolean };
export function EventCatalogList({ kind, rows, motivos }: { kind: CatalogKind; rows: CatalogRow[]; motivos: Motivo[] }) {
  const [filter, setFilter] = useState("todos");
  const [motivoFilter, setMotivoFilter] = useState("");
  const [sort, setSort] = useState<"orden" | "nombre">("orden");
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setEditing(null), []);
  const onResult = useCallback((message: string, ok: boolean) => setNotice({ message, ok }), []);
  const shown = [...filterCatalog(rows, filter, kind === "submotivos" ? motivoFilter : undefined)]
    .sort((a, b) => sort === "orden" ? a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es") : a.nombre.localeCompare(b.nombre, "es"));
  const selected = editing && editing !== "new" ? rows.find((row) => row.id === editing) ?? null : null;

  function changeState(row: CatalogRow) {
    if (pending || busyId) return;
    if (row.activo && !window.confirm(`¿Desactivar ${row.nombre}? Los eventos históricos conservarán sus referencias.${kind === "motivos" && row.submotivosCount ? ` Tiene ${row.submotivosCount} submotivo(s) asociados.` : ""}`)) return;
    setBusyId(row.id); setNotice(null);
    startTransition(async () => {
      try { setNotice(await changeEventCatalogState(kind, row.id, !row.activo)); }
      catch { setNotice({ ok: false, message: "No se pudo actualizar el estado. Inténtalo nuevamente." }); }
      finally { setBusyId(null); }
    });
  }

  return <section aria-labelledby="eventos-title" className="space-y-5">
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 id="eventos-title" className="text-lg font-semibold">Catálogos de Eventos</h2>
      <p className="mt-1 text-sm text-muted">Administra las opciones disponibles y conserva las referencias históricas.</p>
      <nav aria-label="Catálogos de eventos" className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(CATALOGS) as CatalogKind[]).map((key) => <Link key={key} href={`/configuracion?seccion=eventos&catalogo=${key}`}
          aria-current={kind === key ? "page" : undefined}
          className={`rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent ${kind === key ? "bg-accent text-white" : "bg-background text-muted hover:text-foreground"}`}>
          {CATALOGS[key].label}</Link>)}
      </nav>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-semibold">{CATALOGS[kind].label}</h3>
      <button type="button" onClick={() => { setEditing("new"); setNotice(null); }}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Nuevo registro</button>
    </div>
    {notice && <div role={notice.ok ? "status" : "alert"} className={`rounded-md border px-4 py-3 text-sm ${notice.ok ? "border-teal-200 bg-accent-soft text-accent" : "border-red-200 bg-red-50 text-red-800"}`}>{notice.message}</div>}
    {editing && <EventCatalogForm key={editing} kind={kind} row={selected} motivos={motivos} onClose={close} onResult={onResult} />}
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <span className="mr-auto text-sm font-semibold">Registros ({shown.length})</span>
        <label htmlFor="event-status" className="text-sm text-muted">Estado</label>
        <select id="event-status" value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option>
        </select>
        {kind === "submotivos" && <>
          <label htmlFor="event-parent-filter" className="text-sm text-muted">Motivo</label>
          <select id="event-parent-filter" value={motivoFilter} onChange={(event) => setMotivoFilter(event.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
            <option value="">Todos</option>{motivos.map((motivo) => <option key={motivo.id} value={motivo.id}>{motivo.nombre}{motivo.activo ? "" : " (inactivo)"}</option>)}
          </select>
        </>}
        <label htmlFor="event-sort" className="text-sm text-muted">Ordenar</label>
        <select id="event-sort" value={sort} onChange={(event) => setSort(event.target.value as "orden" | "nombre")} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <option value="orden">Orden</option><option value="nombre">Nombre</option>
        </select>
      </div>
      {shown.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">{rows.length ? "No hay registros para estos filtros." : "Aún no hay registros. Crea el primero para comenzar."}</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-background text-xs text-muted"><tr>
            <th scope="col" className="px-5 py-3 font-semibold">Nombre</th>
            {kind === "submotivos" && <th scope="col" className="px-5 py-3 font-semibold">Motivo</th>}
            {kind === "motivos" && <th scope="col" className="px-5 py-3 font-semibold">Submotivos</th>}
            <th scope="col" className="px-5 py-3 font-semibold">Orden</th><th scope="col" className="px-5 py-3 font-semibold">Estado</th>
            <th scope="col" className="px-5 py-3 text-right font-semibold">Acciones</th>
          </tr></thead><tbody className="divide-y divide-border">{shown.map((row) => <tr key={row.id}>
            <td className="px-5 py-3 font-medium">{row.nombre}</td>
            {kind === "submotivos" && <td className="px-5 py-3">{row.motivoNombre}</td>}
            {kind === "motivos" && <td className="px-5 py-3">{row.submotivosCount ? `${row.submotivosCount} asociado(s)` : "—"}</td>}
            <td className="px-5 py-3 tabular-nums">{row.orden}</td>
            <td className="px-5 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${row.activo ? "bg-accent-soft text-accent" : "bg-background text-muted"}`}>{row.activo ? "Activo" : "Inactivo"}</span></td>
            <td className="space-x-3 whitespace-nowrap px-5 py-3 text-right">
              <button type="button" onClick={() => { setEditing(row.id); setNotice(null); }} className="font-medium text-accent hover:underline">Editar</button>
              <button type="button" disabled={pending || !!busyId} onClick={() => changeState(row)} className="font-medium text-foreground hover:underline disabled:cursor-wait disabled:opacity-50">
                {busyId === row.id ? "Procesando…" : row.activo ? "Desactivar" : "Activar"}
              </button>
            </td>
          </tr>)}</tbody>
        </table></div>}
    </div>
  </section>;
}
