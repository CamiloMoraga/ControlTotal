export default function Loading() {
  return <div role="status" className="space-y-4" aria-label="Cargando configuración">
    <div className="h-8 w-48 animate-pulse rounded bg-border" />
    <div className="h-12 w-full animate-pulse rounded bg-border" />
    <div className="h-44 animate-pulse rounded-lg bg-surface" />
    <div className="h-80 animate-pulse rounded-lg bg-surface" />
    <span className="sr-only">Cargando configuración…</span>
  </div>;
}
