import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createParametro, updateParametro, setParametroActivo } from "../../src/lib/parametros/writes";
import { queryParametros } from "../../src/lib/parametros/query";
import { filterParametros } from "../../src/lib/parametros/filters";
import { expectConstraint, snapshot, testClient, withRollback } from "./helpers";

test("gestión de parámetros: catálogo, relaciones, auditoría y rollback", async () => {
  const db = testClient();
  try {
    const before = await snapshot(db);
    const seed = await db.parametro.findMany({ where: { codigo: { in: ["TEMP", "PH", "O2", "SALINIDAD", "CO2"] } }, select: { codigo: true, id: true } });
    assert.equal(seed.length, 5);
    await withRollback(db, async (tx) => {
      const testDb = { $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } as typeof db;
      const suffix = randomUUID().slice(0, 8).toUpperCase();
      const data = { codigo: `DB_PARAM_${suffix}`, nombre: `Parámetro ${suffix}`, unidad: "µg/L", orden: 9 };
      const actor = "operator@example.test";

      assert.equal((await createParametro(testDb, actor, data)).ok, true);
      const created = await tx.parametro.findUniqueOrThrow({ where: { codigo: data.codigo } });
      assert.equal(created.unidad, "µg/L");
      const creation = await tx.auditoria.findFirstOrThrow({ where: { entidadId: created.id, accion: "CREATE" } });
      assert.deepEqual(creation.despues, { ...data, activo: true });
      assert.equal(creation.antes, null);

      assert.equal((await createParametro(testDb, actor, { ...data, nombre: `${data.nombre} Dos` })).ok, false);
      assert.equal((await createParametro(testDb, actor, { ...data, codigo: `${data.codigo}_2`, nombre: `  PARÁMETRO  ${suffix.toLowerCase()}  ` })).ok, false);
      assert.equal((await updateParametro(testDb, actor, randomUUID(), data)).ok, false);
      assert.equal((await updateParametro(testDb, actor, created.id, { ...data, codigo: "CAMBIADO" })).ok, false);

      const edited = { ...data, nombre: `${data.nombre} Editado`, unidad: "°C", orden: 10 };
      assert.equal((await updateParametro(testDb, actor, created.id, edited)).ok, true);
      assert.equal((await updateParametro(testDb, actor, created.id, edited)).changed, false);
      const updateAudit = await tx.auditoria.findFirstOrThrow({ where: { entidadId: created.id, accion: "UPDATE" } });
      assert.deepEqual(updateAudit.antes, { ...data, activo: true });
      assert.deepEqual(updateAudit.despues, { ...edited, activo: true });

      const pic = await tx.piscicultura.findFirstOrThrow();
      const jornada = await tx.jornadaParametros.create({ data: { pisciculturaId: pic.id, fecha: new Date("2099-12-31T00:00:00.000Z") } });
      const muestra = await tx.muestraParametro.create({ data: { jornadaId: jornada.id, sistema: "HATCHERY", hora: new Date("1970-01-01T12:00:00.000Z") } });
      const medicion = await tx.medicionParametro.create({ data: { muestraId: muestra.id, parametroId: created.id, punto: "GENERAL", valor: "1.2345" } });
      const evento = await tx.eventoOperacional.create({ data: { pisciculturaId: pic.id, parametroId: created.id, inicio: new Date("2099-12-31T12:00:00.000Z") } });

      assert.equal((await setParametroActivo(testDb, actor, created.id, false)).ok, true);
      assert.equal((await setParametroActivo(testDb, actor, created.id, false)).changed, false);
      assert.equal((await tx.medicionParametro.findUniqueOrThrow({ where: { id: medicion.id } })).parametroId, created.id);
      assert.equal((await tx.eventoOperacional.findUniqueOrThrow({ where: { id: evento.id } })).parametroId, created.id);
      const listed = await queryParametros(tx);
      assert.ok(listed.every((row, index) => index === 0 || listed[index - 1].orden <= row.orden));
      assert.ok(filterParametros(listed, "inactivos").some((row) => row.id === created.id));
      assert.ok(!filterParametros(listed, "activos").some((row) => row.id === created.id));
      assert.equal((await tx.parametro.findUniqueOrThrow({ where: { id: created.id } })).activo, false);
      assert.equal((await setParametroActivo(testDb, actor, created.id, true)).ok, true);
      const actions = await tx.auditoria.findMany({ where: { entidadId: created.id } });
      assert.deepEqual(actions.map((row) => row.accion).sort(), ["ACTIVATE", "CREATE", "DEACTIVATE", "UPDATE"]);
      assert.ok(actions.every((row) => row.actorEmail === actor && row.modulo === "configuracion" && row.entidad === "parametro"));
      assert.ok(actions.every((row) => Object.keys((row.despues ?? {}) as object).sort().join() === "activo,codigo,nombre,orden,unidad"));

      const failedDb = { $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => {
        await tx.$executeRawUnsafe("SAVEPOINT parametro_audit_failure");
        try {
          const client = { $executeRaw: tx.$executeRaw.bind(tx), parametro: tx.parametro,
            auditoria: { create: async () => { throw new Error("audit unavailable"); } } } as unknown as typeof tx;
          return await fn(client);
        } catch (error) {
          await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT parametro_audit_failure");
          throw error;
        } finally {
          await tx.$executeRawUnsafe("RELEASE SAVEPOINT parametro_audit_failure");
        }
      } } as typeof db;
      assert.equal((await updateParametro(failedDb, actor, created.id, { ...edited, nombre: "Fallido" })).ok, false);
      assert.equal((await tx.parametro.findUniqueOrThrow({ where: { id: created.id } })).nombre, edited.nombre);
      assert.equal(await tx.auditoria.count({ where: { entidadId: created.id } }), 4);

      await expectConstraint(tx, () => tx.parametro.create({ data: { codigo: `${data.codigo}_3`, nombre: `  ${edited.nombre.toUpperCase()}   ` } }), ["P2002", "23505"]);
    });
    assert.deepEqual(await snapshot(db), before);
    const seedAfter = await db.parametro.findMany({ where: { codigo: { in: ["TEMP", "PH", "O2", "SALINIDAD", "CO2"] } }, select: { codigo: true, id: true } });
    assert.deepEqual(seedAfter.sort((a, b) => a.codigo.localeCompare(b.codigo)), seed.sort((a, b) => a.codigo.localeCompare(b.codigo)));
  } finally { await db.$disconnect(); }
});
