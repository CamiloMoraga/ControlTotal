import type { Prisma } from "@/generated/prisma/client";
import { AUDIT_PAGE_SIZE, nextIsoDate, startOfSantiagoDay, type AuditSearch } from "./search";

type AuditReader = Pick<Prisma.TransactionClient, "auditoria">;

export function auditWhere(filters: AuditSearch["filters"]): Prisma.AuditoriaWhereInput {
  return {
    ...(filters.desde || filters.hasta ? { fecha: {
      ...(filters.desde ? { gte: startOfSantiagoDay(filters.desde) } : {}),
      ...(filters.hasta ? { lt: startOfSantiagoDay(nextIsoDate(filters.hasta)) } : {}),
    } } : {}),
    ...(filters.modulo ? { modulo: filters.modulo } : {}),
    ...(filters.accion ? { accion: filters.accion } : {}),
    ...(filters.entidad ? { entidad: filters.entidad } : {}),
    ...(filters.usuario ? { actorEmail: { equals: filters.usuario, mode: "insensitive" } } : {}),
  };
}

export async function queryAuditPage(db: AuditReader, search: AuditSearch) {
  const where = auditWhere(search.filters);
  const total = await db.auditoria.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  if (search.page > totalPages) return { rows: [], total, totalPages, outOfRange: true };
  const rows = await db.auditoria.findMany({
    where,
    select: { id: true, fecha: true, actorEmail: true, modulo: true, accion: true, entidad: true, entidadId: true },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
    skip: (search.page - 1) * AUDIT_PAGE_SIZE,
    take: AUDIT_PAGE_SIZE,
  });
  return { rows, total, totalPages, outOfRange: false };
}

export async function queryAuditDetail(db: AuditReader, id: string) {
  return db.auditoria.findUnique({ where: { id },
    select: { id: true, fecha: true, actorEmail: true, modulo: true, accion: true, entidad: true, entidadId: true, antes: true, despues: true },
  });
}

export type AuditPage = Awaited<ReturnType<typeof queryAuditPage>>;
export type AuditDetail = NonNullable<Awaited<ReturnType<typeof queryAuditDetail>>>;
