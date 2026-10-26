import { Prisma } from "@/generated/prisma/client";
import type { prisma } from "@/lib/prisma";
import { CATALOGS, nameKey, UUID_PATTERN, type CatalogInput, type CatalogKind } from "./validation";

type Database = typeof prisma;
type Tx = Prisma.TransactionClient;
type Row = { id: string; nombre: string; orden: number; activa?: boolean; activo?: boolean; motivoId?: string };
export type WriteResult = { ok: true; changed: boolean; message: string } | { ok: false; message: string; field?: "nombre" | "motivoId" };

function status(row: Row) { return row.activa ?? row.activo ?? false; }
function snapshot(row: Row) {
  return { nombre: row.nombre, orden: row.orden,
    ...(row.motivoId !== undefined ? { motivoId: row.motivoId } : {}),
    ...(row.activa !== undefined ? { activa: row.activa } : { activo: row.activo ?? false }) };
}
function failure(error: unknown): WriteResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, field: "nombre", message: "Ya existe un registro con ese nombre." };
    if (error.code === "P2003" || error.code === "P2025") return { ok: false, message: "La referencia indicada ya no existe." };
  }
  return { ok: false, message: "No se pudo guardar el catálogo. Inténtalo nuevamente." };
}
function model(tx: Tx, kind: CatalogKind) {
  switch (kind) {
    case "categorias": return {
      find: (id: string) => tx.categoriaEvento.findUnique({ where: { id } }),
      list: () => tx.categoriaEvento.findMany(),
      create: (data: CatalogInput) => tx.categoriaEvento.create({ data: { nombre: data.nombre, orden: data.orden } }),
      update: (id: string, data: CatalogInput) => tx.categoriaEvento.update({ where: { id }, data: { nombre: data.nombre, orden: data.orden } }),
      state: (id: string, active: boolean) => tx.categoriaEvento.update({ where: { id }, data: { activa: active } }),
    };
    case "condiciones": return {
      find: (id: string) => tx.condicionEvento.findUnique({ where: { id } }),
      list: () => tx.condicionEvento.findMany(),
      create: (data: CatalogInput) => tx.condicionEvento.create({ data: { nombre: data.nombre, orden: data.orden } }),
      update: (id: string, data: CatalogInput) => tx.condicionEvento.update({ where: { id }, data: { nombre: data.nombre, orden: data.orden } }),
      state: (id: string, active: boolean) => tx.condicionEvento.update({ where: { id }, data: { activa: active } }),
    };
    case "areas": return {
      find: (id: string) => tx.areaOperacional.findUnique({ where: { id } }),
      list: () => tx.areaOperacional.findMany(),
      create: (data: CatalogInput) => tx.areaOperacional.create({ data: { nombre: data.nombre, orden: data.orden } }),
      update: (id: string, data: CatalogInput) => tx.areaOperacional.update({ where: { id }, data: { nombre: data.nombre, orden: data.orden } }),
      state: (id: string, active: boolean) => tx.areaOperacional.update({ where: { id }, data: { activa: active } }),
    };
    case "motivos": return {
      find: (id: string) => tx.motivoEvento.findUnique({ where: { id } }),
      list: () => tx.motivoEvento.findMany(),
      create: (data: CatalogInput) => tx.motivoEvento.create({ data: { nombre: data.nombre, orden: data.orden } }),
      update: (id: string, data: CatalogInput) => tx.motivoEvento.update({ where: { id }, data: { nombre: data.nombre, orden: data.orden } }),
      state: (id: string, active: boolean) => tx.motivoEvento.update({ where: { id }, data: { activo: active } }),
    };
    case "submotivos": return {
      find: (id: string) => tx.submotivoEvento.findUnique({ where: { id } }),
      list: () => tx.submotivoEvento.findMany(),
      create: (data: CatalogInput) => tx.submotivoEvento.create({ data: { nombre: data.nombre, orden: data.orden, motivoId: data.motivoId! } }),
      update: (id: string, data: CatalogInput) => tx.submotivoEvento.update({ where: { id }, data: { nombre: data.nombre, orden: data.orden, motivoId: data.motivoId! } }),
      state: (id: string, active: boolean) => tx.submotivoEvento.update({ where: { id }, data: { activo: active } }),
    };
  }
}

async function lock(tx: Tx) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(17041, 4)`; }
async function parentError(tx: Tx, motivoId: string | undefined): Promise<WriteResult | null> {
  if (!motivoId || !UUID_PATTERN.test(motivoId)) return { ok: false, field: "motivoId", message: "Selecciona un motivo válido." };
  const motivo = await tx.motivoEvento.findUnique({ where: { id: motivoId } });
  if (!motivo) return { ok: false, field: "motivoId", message: "El motivo no existe." };
  if (!motivo.activo) return { ok: false, field: "motivoId", message: "El motivo está inactivo." };
  return null;
}
async function duplicate(tx: Tx, kind: CatalogKind, data: CatalogInput, exceptId?: string): Promise<WriteResult | null> {
  const rows = await model(tx, kind).list();
  return rows.some((row) => row.id !== exceptId && nameKey(row.nombre) === nameKey(data.nombre)
    && (kind !== "submotivos" || (row as Row).motivoId === data.motivoId))
    ? { ok: false, field: "nombre", message: "Ya existe un registro con ese nombre en este catálogo o motivo." } : null;
}
async function audit(tx: Tx, actorEmail: string, kind: CatalogKind, action: string, id: string, before: Row | null, after: Row) {
  await tx.auditoria.create({ data: { actorEmail, modulo: "configuracion", entidad: CATALOGS[kind].entity,
    entidadId: id, accion: action, ...(before ? { antes: snapshot(before) } : {}), despues: snapshot(after) } });
}

export async function createCatalog(db: Database, actorEmail: string, kind: CatalogKind, data: CatalogInput): Promise<WriteResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lock(tx);
      if (kind === "submotivos") { const error = await parentError(tx, data.motivoId); if (error) return error; }
      const conflict = await duplicate(tx, kind, data); if (conflict) return conflict;
      const row = await model(tx, kind).create(data);
      await audit(tx, actorEmail, kind, "CREATE", row.id, null, row);
      return { ok: true, changed: true, message: "Registro creado." };
    });
  } catch (error) { return failure(error); }
}

export async function updateCatalog(db: Database, actorEmail: string, kind: CatalogKind, id: string, data: CatalogInput): Promise<WriteResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lock(tx);
      const before = await model(tx, kind).find(id);
      if (!before) return { ok: false, message: "El registro ya no existe." };
      const old = before as Row;
      const moving = kind === "submotivos" && old.motivoId !== data.motivoId;
      if (moving) {
        const error = await parentError(tx, data.motivoId); if (error) return error;
        // Blocks concurrent FK references while checking whether this submotivo has historical use.
        await tx.$queryRaw`SELECT id FROM submotivo_evento WHERE id = ${id}::uuid FOR UPDATE`;
        if (await tx.eventoOperacional.count({ where: { submotivoId: id } })) {
          return { ok: false, field: "motivoId", message: "No se puede cambiar el motivo: el submotivo ya se utilizó en eventos." };
        }
      }
      const conflict = await duplicate(tx, kind, data, id); if (conflict) return conflict;
      if (old.nombre === data.nombre && old.orden === data.orden && !moving) {
        return { ok: true, changed: false, message: "Sin cambios para guardar." };
      }
      const after = await model(tx, kind).update(id, data);
      await audit(tx, actorEmail, kind, "UPDATE", id, old, after);
      return { ok: true, changed: true, message: "Registro actualizado." };
    });
  } catch (error) { return failure(error); }
}

export async function setCatalogState(db: Database, actorEmail: string, kind: CatalogKind, id: string, active: boolean): Promise<WriteResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lock(tx);
      const before = await model(tx, kind).find(id);
      if (!before) return { ok: false, message: "El registro ya no existe." };
      const old = before as Row;
      if (status(old) === active) return { ok: true, changed: false, message: "El estado ya estaba actualizado." };
      if (kind === "submotivos" && active) { const error = await parentError(tx, old.motivoId); if (error) return error; }
      const after = await model(tx, kind).state(id, active);
      await audit(tx, actorEmail, kind, active ? "ACTIVATE" : "DEACTIVATE", id, old, after);
      return { ok: true, changed: true, message: active ? "Registro activado." : "Registro desactivado." };
    });
  } catch (error) { return failure(error); }
}
