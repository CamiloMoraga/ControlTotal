import { Prisma } from "@/generated/prisma/client";
import type { prisma } from "@/lib/prisma";
import { nameKey, type ParametroInput } from "./validation";

export type WriteResult = { ok: true; changed: boolean; message: string } | { ok: false; message: string; field?: "nombre" | "codigo" };
type Database = typeof prisma;
type Row = Awaited<ReturnType<Database["parametro"]["findFirstOrThrow"]>>;

function snapshot(row: Row) {
  return { codigo: row.codigo, nombre: row.nombre, unidad: row.unidad, orden: row.orden, activo: row.activo };
}

function failure(error: unknown): WriteResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { ok: false, message: "Ya existe un parámetro con ese nombre o código." };
  }
  return { ok: false, message: "No se pudo guardar el parámetro. Inténtalo nuevamente." };
}

async function lock(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(17041, 3)`;
}

async function conflict(tx: Prisma.TransactionClient, data: ParametroInput, exceptId?: string): Promise<WriteResult | null> {
  const rows = await tx.parametro.findMany({ select: { id: true, codigo: true, nombre: true } });
  if (rows.some((row) => row.id !== exceptId && row.codigo.toUpperCase() === data.codigo)) {
    return { ok: false, field: "codigo", message: "Ya existe un parámetro con ese código." };
  }
  if (rows.some((row) => row.id !== exceptId && nameKey(row.nombre) === nameKey(data.nombre))) {
    return { ok: false, field: "nombre", message: "Ya existe un parámetro con ese nombre." };
  }
  return null;
}

export async function createParametro(db: Database, actorEmail: string, data: ParametroInput): Promise<WriteResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lock(tx);
      const duplicate = await conflict(tx, data);
      if (duplicate) return duplicate;
      const row = await tx.parametro.create({ data });
      await tx.auditoria.create({ data: {
        actorEmail, modulo: "configuracion", entidad: "parametro", entidadId: row.id,
        accion: "CREATE", despues: snapshot(row),
      } });
      return { ok: true, changed: true, message: "Parámetro creado." };
    });
  } catch (error) { return failure(error); }
}

export async function updateParametro(db: Database, actorEmail: string, id: string, data: ParametroInput): Promise<WriteResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lock(tx);
      const before = await tx.parametro.findUnique({ where: { id } });
      if (!before) return { ok: false, message: "El parámetro ya no existe." };
      if (data.codigo !== before.codigo) return { ok: false, field: "codigo", message: "El código no se puede modificar." };
      const duplicate = await conflict(tx, data, id);
      if (duplicate) return duplicate;
      if (before.nombre === data.nombre && before.unidad === data.unidad && before.orden === data.orden) {
        return { ok: true, changed: false, message: "Sin cambios para guardar." };
      }
      const after = await tx.parametro.update({ where: { id }, data: { nombre: data.nombre, unidad: data.unidad, orden: data.orden } });
      await tx.auditoria.create({ data: {
        actorEmail, modulo: "configuracion", entidad: "parametro", entidadId: id,
        accion: "UPDATE", antes: snapshot(before), despues: snapshot(after),
      } });
      return { ok: true, changed: true, message: "Parámetro actualizado." };
    });
  } catch (error) { return failure(error); }
}

export async function setParametroActivo(db: Database, actorEmail: string, id: string, activo: boolean): Promise<WriteResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lock(tx);
      const before = await tx.parametro.findUnique({ where: { id } });
      if (!before) return { ok: false, message: "El parámetro ya no existe." };
      if (before.activo === activo) return { ok: true, changed: false, message: "El estado ya estaba actualizado." };
      const after = await tx.parametro.update({ where: { id }, data: { activo } });
      await tx.auditoria.create({ data: {
        actorEmail, modulo: "configuracion", entidad: "parametro", entidadId: id,
        accion: activo ? "ACTIVATE" : "DEACTIVATE", antes: snapshot(before), despues: snapshot(after),
      } });
      return { ok: true, changed: true, message: activo ? "Parámetro activado." : "Parámetro desactivado." };
    });
  } catch (error) { return failure(error); }
}
