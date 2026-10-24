import { Prisma } from "@/generated/prisma/client";
import type { prisma } from "@/lib/prisma";
import { nameKey, type PisciculturaInput } from "./validation";

export type WriteResult = { ok: true; changed: boolean; message: string } | { ok: false; message: string; field?: "nombre" | "codigo" };
type Database = typeof prisma;
type Row = Awaited<ReturnType<Database["piscicultura"]["findFirstOrThrow"]>>;

function snapshot(row: Row) {
  return { nombre: row.nombre, codigo: row.codigo, orden: row.orden, activa: row.activa, notaCamaras: row.notaCamaras };
}

function failure(error: unknown): WriteResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { ok: false, message: "Ya existe una piscicultura con ese nombre o código." };
  }
  return { ok: false, message: "No se pudo guardar la piscicultura. Inténtalo nuevamente." };
}

// Serializa las escrituras de este módulo, incluso antes de aplicar el índice funcional.
// El índice de la migración también protege los cambios hechos fuera de la aplicación.
async function lock(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(17041, 2)`;
}

async function conflict(tx: Prisma.TransactionClient, data: PisciculturaInput, exceptId?: string): Promise<WriteResult | null> {
  const rows = await tx.piscicultura.findMany({ select: { id: true, nombre: true, codigo: true } });
  if (rows.some((row) => row.id !== exceptId && nameKey(row.nombre) === nameKey(data.nombre))) {
    return { ok: false, field: "nombre", message: "Ya existe una piscicultura con ese nombre." };
  }
  if (data.codigo && rows.some((row) => row.id !== exceptId && row.codigo?.toUpperCase() === data.codigo)) {
    return { ok: false, field: "codigo", message: "Ya existe una piscicultura con ese código." };
  }
  return null;
}

export async function createPiscicultura(db: Database, actorEmail: string, data: PisciculturaInput): Promise<WriteResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lock(tx);
      const duplicate = await conflict(tx, data);
      if (duplicate) return duplicate;
      const row = await tx.piscicultura.create({ data });
      await tx.auditoria.create({ data: {
        actorEmail, modulo: "configuracion", entidad: "piscicultura", entidadId: row.id,
        accion: "CREATE", despues: snapshot(row),
      } });
      return { ok: true, changed: true, message: "Piscicultura creada." };
    });
  } catch (error) { return failure(error); }
}

export async function updatePiscicultura(db: Database, actorEmail: string, id: string, data: PisciculturaInput): Promise<WriteResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lock(tx);
      const before = await tx.piscicultura.findUnique({ where: { id } });
      if (!before) return { ok: false, message: "La piscicultura ya no existe." };
      // Los códigos pueden estar integrados fuera de las FK locales. No se cambian en edición.
      if (data.codigo !== before.codigo) return { ok: false, field: "codigo", message: "El código existente está bloqueado para proteger integraciones." };
      const duplicate = await conflict(tx, data, id);
      if (duplicate) return duplicate;
      if (before.nombre === data.nombre && before.orden === data.orden && before.notaCamaras === data.notaCamaras) {
        return { ok: true, changed: false, message: "Sin cambios para guardar." };
      }
      const after = await tx.piscicultura.update({ where: { id }, data: {
        nombre: data.nombre, orden: data.orden, notaCamaras: data.notaCamaras,
      } });
      await tx.auditoria.create({ data: {
        actorEmail, modulo: "configuracion", entidad: "piscicultura", entidadId: id,
        accion: "UPDATE", antes: snapshot(before), despues: snapshot(after),
      } });
      return { ok: true, changed: true, message: "Piscicultura actualizada." };
    });
  } catch (error) { return failure(error); }
}

export async function setPisciculturaActiva(db: Database, actorEmail: string, id: string, activa: boolean): Promise<WriteResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lock(tx);
      const before = await tx.piscicultura.findUnique({ where: { id } });
      if (!before) return { ok: false, message: "La piscicultura ya no existe." };
      if (before.activa === activa) return { ok: true, changed: false, message: "El estado ya estaba actualizado." };
      const after = await tx.piscicultura.update({ where: { id }, data: { activa } });
      await tx.auditoria.create({ data: {
        actorEmail, modulo: "configuracion", entidad: "piscicultura", entidadId: id,
        accion: activa ? "ACTIVATE" : "DEACTIVATE", antes: snapshot(before), despues: snapshot(after),
      } });
      return { ok: true, changed: true, message: activa ? "Piscicultura activada." : "Piscicultura desactivada." };
    });
  } catch (error) { return failure(error); }
}

