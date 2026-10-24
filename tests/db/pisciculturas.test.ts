import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPiscicultura, updatePiscicultura, setPisciculturaActiva } from "../../src/lib/pisciculturas/writes";
import { expectConstraint, snapshot, testClient, withRollback } from "./helpers";

test("gestión de pisciculturas: escrituras, conflictos, auditoría y rollback", async () => {
  const db = testClient();
  try {
    const before = await snapshot(db);
    await withRollback(db, async (tx) => {
      // El servicio ejecuta su transacción sobre la transacción externa del test;
      // withRollback revierte todas las filas creadas durante la prueba.
      const testDb = { $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } as typeof db;
      const suffix = randomUUID().slice(0, 8).toUpperCase();
      const nombre = `DB Test Centro ${suffix}`;
      const codigo = `DB_TEST_${suffix}`;
      const data = { nombre, codigo, orden: 2, notaCamaras: null };
      const actor = "operator@example.test";

      assert.equal((await createPiscicultura(testDb, actor, data)).ok, true);
      const created = await tx.piscicultura.findUniqueOrThrow({ where: { codigo } });
      assert.equal(created.nombre, nombre);
      assert.equal(await tx.auditoria.count({ where: { entidadId: created.id, accion: "CREATE" } }), 1);

      const sameName = await createPiscicultura(testDb, actor, { ...data, nombre: `  db   TEST  Centro  ${suffix.toLowerCase()} `, codigo: `${codigo}_2` });
      assert.equal(sameName.ok, false);
      const sameCode = await createPiscicultura(testDb, actor, { ...data, nombre: `${nombre} Dos` });
      assert.equal(sameCode.ok, false);

      const edited = await updatePiscicultura(testDb, actor, created.id, { ...data, nombre: `${nombre} Editado`, orden: 3, notaCamaras: "Nota" });
      assert.equal(edited.ok, true);
      assert.equal(await tx.auditoria.count({ where: { entidadId: created.id, accion: "UPDATE" } }), 1);
      const noChange = await updatePiscicultura(testDb, actor, created.id, { ...data, nombre: `${nombre} Editado`, orden: 3, notaCamaras: "Nota" });
      assert.deepEqual(noChange, { ok: true, changed: false, message: "Sin cambios para guardar." });
      assert.equal(await tx.auditoria.count({ where: { entidadId: created.id } }), 2);
      assert.equal((await updatePiscicultura(testDb, actor, created.id, { ...data, codigo: "CHANGED" })).ok, false);

      assert.equal((await setPisciculturaActiva(testDb, actor, created.id, false)).ok, true);
      assert.equal((await tx.piscicultura.findUniqueOrThrow({ where: { id: created.id } })).activa, false);
      assert.equal((await setPisciculturaActiva(testDb, actor, created.id, false)).changed, false);
      assert.equal((await setPisciculturaActiva(testDb, actor, created.id, true)).ok, true);
      const actions = await tx.auditoria.findMany({ where: { entidadId: created.id }, orderBy: { fecha: "asc" } });
      assert.deepEqual(actions.map((row) => row.accion).sort(), ["ACTIVATE", "CREATE", "DEACTIVATE", "UPDATE"]);
      assert.ok(actions.every((row) => row.actorEmail === actor && row.modulo === "configuracion" && row.entidad === "piscicultura"));

      // Una falla de auditoría debe abortar la escritura de la misma transacción.
      const failedDb = { $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => {
        await tx.$executeRawUnsafe("SAVEPOINT audit_failure");
        try {
          const client = { $executeRaw: tx.$executeRaw.bind(tx), piscicultura: tx.piscicultura,
            auditoria: { create: async () => { throw new Error("audit unavailable"); } } } as unknown as typeof tx;
          return await fn(client);
        } catch (error) {
          await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT audit_failure");
          throw error;
        } finally {
          await tx.$executeRawUnsafe("RELEASE SAVEPOINT audit_failure");
        }
      } } as typeof db;
      const failed = await updatePiscicultura(failedDb, actor, created.id, { ...data, nombre: `${nombre} Fallido` });
      assert.equal(failed.ok, false);
      assert.equal((await tx.piscicultura.findUniqueOrThrow({ where: { id: created.id } })).nombre, `${nombre} Editado`);
      assert.equal(await tx.auditoria.count({ where: { entidadId: created.id } }), 4);

      await expectConstraint(tx, () => tx.piscicultura.create({ data: { nombre: `  ${nombre.toLowerCase()}   editado ` } }), ["P2002", "23505"]);
    });
    assert.deepEqual(await snapshot(db), before);
  } finally { await db.$disconnect(); }
});
