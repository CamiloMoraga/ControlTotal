import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { queryAuditDetail, queryAuditPage } from "../../src/lib/auditoria/query";
import { nextIsoDate, startOfSantiagoDay, type AuditFilters } from "../../src/lib/auditoria/search";
import { snapshot, testClient, withRollback } from "./helpers";

test("auditoría: orden estable, filtros y páginas de 25 sin cambiar datos", async () => {
  const db = testClient();
  try {
    const before = await snapshot(db);
    await withRollback(db, async (tx) => {
      const modulo = `AUD_TEST_${randomUUID().slice(0, 8)}`;
      const day = "2026-10-10";
      const start = startOfSantiagoDay(day);
      const next = startOfSantiagoDay(nextIsoDate(day));
      const when = new Date(start.getTime() + 12 * 60 * 60 * 1000);
      const ids = Array.from({ length: 30 }, () => randomUUID());
      const afterId = randomUUID();
      await tx.auditoria.createMany({ data: ids.map((id, i) => ({
        id, fecha: when, actorEmail: i % 2 === 0 ? "Audit.Operator@Example.test" : "other@example.test",
        modulo, accion: i < 15 ? "CREATE" : "UPDATE", entidad: i < 20 ? "piscicultura" : "camara",
        entidadId: id, antes: i === 0 ? undefined : { value: i - 1 }, despues: { value: i },
      })) });
      await tx.auditoria.createMany({ data: [
        { fecha: new Date(start.getTime() - 1), modulo, accion: "BOUNDARY", entidad: "piscicultura" },
        { id: afterId, fecha: next, modulo, accion: "BOUNDARY", entidad: "piscicultura" },
      ] });
      const page = (filters: AuditFilters, number = 1) => queryAuditPage(tx, { filters: { modulo, ...filters }, page: number });
      const all = await page({});
      assert.equal(all.total, 32);
      assert.equal(all.rows.length, 25);
      assert.ok(all.rows.every((row, i, rows) => i === 0 || rows[i - 1].fecha >= row.fecha));
      const second = await page({}, 2);
      assert.equal(second.rows.length, 7);
      assert.equal(new Set([...all.rows, ...second.rows].map((row) => row.id)).size, 32);
      const sameTimeIds = [...ids].sort().reverse();
      assert.deepEqual(all.rows.slice(0, 25).map((row) => row.id), [afterId, ...sameTimeIds].slice(0, 25));

      assert.equal((await page({ desde: day, hasta: day })).total, 30);
      assert.equal((await page({ accion: "CREATE" })).total, 15);
      assert.equal((await page({ entidad: "camara" })).total, 10);
      assert.equal((await page({ usuario: "audit.operator@example.test" })).total, 15);
      assert.equal((await page({ desde: day, hasta: day, accion: "CREATE", entidad: "piscicultura", usuario: "audit.operator@example.test" })).total, 8);
      assert.equal((await page({ modulo: "different" })).total, 0);
      assert.equal((await page({}, 3)).outOfRange, true);

      const detail = await queryAuditDetail(tx, ids[0]);
      assert.equal(detail?.antes, null);
      assert.deepEqual(detail?.despues, { value: 0 });
    });
    assert.deepEqual(await snapshot(db), before);
  } finally { await db.$disconnect(); }
});
