import type { ModuleId } from "@/lib/navigation";

const paths: Record<ModuleId, string> = {
  inicio: "m3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7",
  parametros: "M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6",
  camaras: "M3 7h12v12H3V7Zm12 4 6-4v12l-6-4M6 4h6",
  diario: "M5 4h14v17H5V4Zm3-2v4m8-4v4M8 10h8m-8 4h8m-8 4h4",
  unificado: "M8 3h11v14H8V3ZM5 7H3v14h12v-2m-4-12h5m-5 4h5",
  eventos: "m12 3 10 18H2L12 3Zm0 6v5m0 3v1",
  historico: "M3 10a9 9 0 1 1 1 7M3 4v6h6m3-4v6l4 2",
  estadisticas: "M4 3v18h17M8 17v-5m5 5V7m5 10V4",
  configuracion: "M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6",
  auditoria: "M5 3h10l4 4v14H5V3Zm10 0v5h4M8 12h8m-8 4h5",
};

export function ModuleIcon({ module, className = "size-5" }: { module: ModuleId; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[module]} />
    </svg>
  );
}
