import "dotenv/config";
import assert from "node:assert/strict";
import { createPrismaClient } from "../../src/lib/prisma-client";

const tables = ["piscicultura", "parametro", "jornada_parametros", "muestra_parametro",
  "medicion_parametro", "camara", "incidencia_camara", "reporte_diario",
  "reporte_diario_piscicultura", "reporte_unificado", "reporte_unificado_piscicultura",
  "evento_operacional", "evento_estanque", "categoria_evento", "condicion_evento",
  "area_operacional", "motivo_evento", "submotivo_evento", "auditoria"] as const;

export function assertLocalTestDatabase() {
  const value = process.env.DATABASE_URL;
  assert.ok(value, "Falta DATABASE_URL para test:db");
  const url = new URL(value);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    && url.port === "5434" && url.pathname === "/controltotal_dev"
    && (url.searchParams.get("schema") ?? "public") === "public"
    && !url.searchParams.has("sslmode"),
  "test:db sólo admite PostgreSQL local controltotal_dev en puerto 5434, schema public y sin SSL");
}

export function testClient() {
  assertLocalTestDatabase();
  return createPrismaClient();
}

export async function snapshot(client: ReturnType<typeof createPrismaClient>) {
  const result: Record<string, number> = {};
  for (const table of tables) {
    const rows = await client.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*)::integer AS count FROM "${table}"`);
    result[table] = rows[0].count;
  }
  return result;
}

const rollback = Symbol("deliberate rollback");

export async function withRollback<T>(client: ReturnType<typeof createPrismaClient>,
  action: (tx: Parameters<Parameters<typeof client.$transaction>[0]>[0]) => Promise<T>): Promise<T> {
  let result!: T;
  try {
    await client.$transaction(async (tx) => {
      result = await action(tx);
      throw rollback;
    }, { timeout: 60_000, maxWait: 10_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  return result;
}

export async function expectConstraint(tx: Parameters<Parameters<ReturnType<typeof createPrismaClient>["$transaction"]>[0]>[0],
  action: () => Promise<unknown>, codes: string[]) {
  await tx.$executeRawUnsafe("SAVEPOINT constraint_check");
  let error: unknown;
  try {
    await action();
  } catch (caught) {
    error = caught;
  } finally {
    await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT constraint_check");
    await tx.$executeRawUnsafe("RELEASE SAVEPOINT constraint_check");
  }
  assert.ok(error, "La restricción debía rechazar la operación");
  const actual = error as { code?: string; meta?: {
    code?: string; driverAdapterError?: { cause?: { code?: string } };
  } };
  const sqlstate = actual.meta?.driverAdapterError?.cause?.code ?? actual.meta?.code ?? actual.code;
  assert.ok(codes.includes(sqlstate ?? ""),
    `Código de restricción inesperado: ${sqlstate ?? "desconocido"}`);
}
