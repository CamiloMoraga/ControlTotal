export const modules = {
  inicio: {
    href: "/",
    title: "Inicio",
    description: "Vista general del espacio de trabajo operacional.",
  },
  parametros: {
    href: "/parametros",
    title: "Parámetros",
    description: "Registro y consulta de parámetros operacionales.",
  },
  camaras: {
    href: "/camaras",
    title: "Cámaras",
    description: "Estado e historial de cámaras por piscicultura.",
  },
  diario: {
    href: "/reportes/diario",
    title: "Reporte Diario",
    description: "Registro operacional por turno y piscicultura.",
  },
  unificado: {
    href: "/reportes/unificado",
    title: "Reporte Unificado",
    description: "Consolidación diaria de novedades e incidencias.",
  },
  eventos: {
    href: "/eventos",
    title: "Eventos",
    description: "Gestión de incidencias operacionales.",
  },
  historico: {
    href: "/historico",
    title: "Histórico",
    description: "Consulta de registros históricos.",
  },
  estadisticas: {
    href: "/estadisticas",
    title: "Estadísticas",
    description: "Indicadores y análisis operacionales.",
  },
  configuracion: {
    href: "/configuracion",
    title: "Configuración",
    description: "Administración de catálogos y configuración del sistema.",
  },
  auditoria: {
    href: "/auditoria",
    title: "Auditoría",
    description: "Historial de operaciones relevantes realizadas en Control Total.",
  },
} as const;

export type ModuleId = keyof typeof modules;

export const navigationGroups = [
  { title: "Operación", items: ["inicio", "parametros", "camaras"] },
  { title: "Reportes", items: ["diario", "unificado", "eventos"] },
  { title: "Análisis", items: ["historico", "estadisticas"] },
  { title: "Sistema", items: ["configuracion", "auditoria"] },
] as const satisfies ReadonlyArray<{
  title: string;
  items: readonly ModuleId[];
}>;

export function getCurrentModule(pathname: string) {
  return Object.values(modules).find((item) => item.href === pathname);
}
