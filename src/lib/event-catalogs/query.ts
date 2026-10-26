import type { Prisma } from "@/generated/prisma/client";
import type { CatalogKind } from "./validation";

export type CatalogRow = { id: string; nombre: string; orden: number; activo: boolean; motivoId?: string; motivoNombre?: string; submotivosCount?: number };
type Reader = Pick<Prisma.TransactionClient, "categoriaEvento" | "condicionEvento" | "areaOperacional" | "motivoEvento" | "submotivoEvento">;
const orderBy = [{ orden: "asc" as const }, { nombre: "asc" as const }];

export async function queryCatalog(db: Reader, kind: CatalogKind): Promise<CatalogRow[]> {
  switch (kind) {
    case "categorias": return (await db.categoriaEvento.findMany({ orderBy })).map((row) => ({ ...row, activo: row.activa }));
    case "condiciones": return (await db.condicionEvento.findMany({ orderBy })).map((row) => ({ ...row, activo: row.activa }));
    case "areas": return (await db.areaOperacional.findMany({ orderBy })).map((row) => ({ ...row, activo: row.activa }));
    case "motivos": return (await db.motivoEvento.findMany({ orderBy, include: { _count: { select: { submotivos: true } } } })).map((row) => ({ ...row, submotivosCount: row._count.submotivos }));
    case "submotivos": return (await db.submotivoEvento.findMany({ orderBy, include: { motivo: { select: { nombre: true } } } })).map((row) => ({ ...row, motivoNombre: row.motivo.nombre }));
  }
}

export async function queryMotivos(db: Reader) {
  return db.motivoEvento.findMany({ select: { id: true, nombre: true, activo: true }, orderBy });
}

