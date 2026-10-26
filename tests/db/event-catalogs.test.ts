import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createCatalog, updateCatalog, setCatalogState } from "../../src/lib/event-catalogs/writes";
import { queryCatalog, queryMotivos } from "../../src/lib/event-catalogs/query";
import { filterCatalog } from "../../src/lib/event-catalogs/filters";
import type { CatalogKind } from "../../src/lib/event-catalogs/validation";
import { expectConstraint, snapshot, testClient, withRollback } from "./helpers";

test("catálogos de eventos: escrituras, historia, auditoría y rollback", async () => {
  const db = testClient();
  try {
    const beforeCounts = await snapshot(db);
    await withRollback(db, async (tx) => {
      const testDb = { $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } as typeof db;
      const actor = "operator@example.test";
      const suffix = randomUUID().slice(0, 8);
      const kinds: CatalogKind[] = ["categorias", "condiciones", "areas", "motivos"];
      const ids: Record<string, string> = {};
      for (const kind of kinds) {
        const data = { nombre: `${kind} ${suffix}`, orden: 10 };
        assert.equal((await createCatalog(testDb, actor, kind, data)).ok, true);
        const row = (await queryCatalog(tx, kind)).find((item) => item.nombre === data.nombre)!;
        ids[kind] = row.id;
        assert.equal((await createCatalog(testDb, actor, kind, { ...data, nombre: `  ${kind.toUpperCase()}  ${suffix} ` })).ok, false);
        assert.equal((await updateCatalog(testDb, actor, kind, row.id, data)).changed, false);
        assert.equal((await updateCatalog(testDb, actor, kind, row.id, { ...data, orden: 11 })).changed, true);
        assert.equal((await setCatalogState(testDb, actor, kind, row.id, false)).changed, true);
        assert.equal((await setCatalogState(testDb, actor, kind, row.id, false)).changed, false);
        assert.ok(filterCatalog(await queryCatalog(tx, kind), "inactivos").some((item) => item.id === row.id));
        assert.ok(!filterCatalog(await queryCatalog(tx, kind), "activos").some((item) => item.id === row.id));
        const ordered = await queryCatalog(tx, kind);
        assert.ok(ordered.every((item, index) => index === 0 || ordered[index - 1].orden <= item.orden));
        assert.equal((await setCatalogState(testDb, actor, kind, row.id, true)).changed, true);
        const audits = await tx.auditoria.findMany({ where: { entidadId: row.id }, orderBy: { fecha: "asc" } });
        assert.deepEqual(audits.map((item) => item.accion).sort(), ["ACTIVATE", "CREATE", "DEACTIVATE", "UPDATE"]);
        assert.ok(audits.every((item) => item.actorEmail === actor && item.modulo === "configuracion"));
      }
      assert.ok((await queryMotivos(tx)).some((item) => item.id === ids.motivos));
      assert.equal((await createCatalog(testDb, actor, "submotivos", { nombre: "Sin padre", orden: 0 })).ok, false);
      assert.equal((await createCatalog(testDb, actor, "submotivos", { nombre: "Sin padre", orden: 0, motivoId: randomUUID() })).ok, false);
      const motivo2 = await tx.motivoEvento.create({ data: { nombre: `Otro ${suffix}`, orden: 1 } });
      const motivoInactivo = await tx.motivoEvento.create({ data: { nombre: `Inactivo ${suffix}`, activo: false } });
      assert.equal((await createCatalog(testDb, actor, "submotivos", { nombre: "Imposible", orden: 0, motivoId: motivoInactivo.id })).ok, false);
      const subData = { nombre: `Sub ${suffix}`, orden: 1, motivoId: ids.motivos };
      assert.equal((await createCatalog(testDb, actor, "submotivos", subData)).ok, true);
      const sub = (await queryCatalog(tx, "submotivos")).find((item) => item.nombre === subData.nombre)!;
      const creation = await tx.auditoria.findFirstOrThrow({ where: { entidadId: sub.id, accion: "CREATE" } });
      assert.equal((creation.despues as { motivoId: string }).motivoId, ids.motivos);
      assert.equal(creation.antes, null);
      assert.equal((await updateCatalog(testDb, actor, "submotivos", sub.id, subData)).changed, false);
      assert.equal((await updateCatalog(testDb, actor, "submotivos", sub.id, { ...subData, orden: 2 })).changed, true);
      assert.equal(sub.motivoNombre, `${"motivos"} ${suffix}`);
      assert.equal((await createCatalog(testDb, actor, "submotivos", { ...subData, nombre: `  SUB  ${suffix}  ` })).ok, false);
      assert.equal((await createCatalog(testDb, actor, "submotivos", { ...subData, motivoId: motivo2.id })).ok, true);
      assert.equal(filterCatalog(await queryCatalog(tx, "submotivos"), "todos", ids.motivos).length, 1);
      assert.equal((await updateCatalog(testDb, actor, "submotivos", sub.id, { ...subData, motivoId: motivo2.id })).ok, false);
      const other = await tx.motivoEvento.create({ data: { nombre: `Tercero ${suffix}` } });
      assert.equal((await updateCatalog(testDb, actor, "submotivos", sub.id, { ...subData, motivoId: other.id })).changed, true);
      const moveAudit = (await tx.auditoria.findMany({ where: { entidadId: sub.id, accion: "UPDATE" } }))
        .find((item) => (item.despues as { motivoId: string }).motivoId === other.id)!;
      assert.equal((moveAudit.antes as { motivoId: string }).motivoId, ids.motivos);
      assert.equal((moveAudit.despues as { motivoId: string }).motivoId, other.id);
      const pic = await tx.piscicultura.findFirstOrThrow();
      const event = await tx.eventoOperacional.create({ data: { pisciculturaId: pic.id, inicio: new Date("2099-12-31T12:00:00.000Z"),
        motivoId: other.id, submotivoId: sub.id, categoriaId: ids.categorias, condicionId: ids.condiciones, areaId: ids.areas } });
      assert.equal((await updateCatalog(testDb, actor, "submotivos", sub.id, { ...subData, motivoId: ids.motivos })).ok, false);
      assert.equal((await setCatalogState(testDb, actor, "submotivos", sub.id, false)).ok, true);
      assert.equal((await setCatalogState(testDb, actor, "submotivos", sub.id, true)).ok, true);
      assert.equal((await setCatalogState(testDb, actor, "submotivos", sub.id, false)).ok, true);
      assert.equal((await setCatalogState(testDb, actor, "motivos", other.id, false)).ok, true);
      const historical = await tx.eventoOperacional.findUniqueOrThrow({ where: { id: event.id } });
      assert.equal(historical.submotivoId, sub.id);
      assert.equal(historical.motivoId, other.id);
      assert.equal((await setCatalogState(testDb, actor, "submotivos", sub.id, true)).ok, false);
      assert.equal((await queryCatalog(tx, "motivos")).find((item) => item.id === other.id)?.submotivosCount, 1);

      const failedDb = { $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => {
        await tx.$executeRawUnsafe("SAVEPOINT event_catalog_audit_failure");
        try { return await fn({ ...tx, $executeRaw: tx.$executeRaw.bind(tx), categoriaEvento: tx.categoriaEvento,
          auditoria: { create: async () => { throw new Error("audit unavailable"); } } } as typeof tx); }
        catch (error) { await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT event_catalog_audit_failure"); throw error; }
        finally { await tx.$executeRawUnsafe("RELEASE SAVEPOINT event_catalog_audit_failure"); }
      } } as typeof db;
      const auditCount = await tx.auditoria.count({ where: { entidadId: ids.categorias } });
      assert.equal((await updateCatalog(failedDb, actor, "categorias", ids.categorias, { nombre: "No persistir", orden: 2 })).ok, false);
      assert.notEqual((await tx.categoriaEvento.findUniqueOrThrow({ where: { id: ids.categorias } })).nombre, "No persistir");
      assert.equal(await tx.auditoria.count({ where: { entidadId: ids.categorias } }), auditCount);
      await expectConstraint(tx, () => tx.categoriaEvento.create({ data: { nombre: `  CATEGORIAS  ${suffix.toUpperCase()} ` } }), ["P2002", "23505"]);
    });
    assert.deepEqual(await snapshot(db), beforeCounts);
  } finally { await db.$disconnect(); }
});
