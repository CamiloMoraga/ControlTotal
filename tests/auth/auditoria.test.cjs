const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { moduleLoader } = require("./load-module.cjs");

const load = moduleLoader({
  "next/link": { __esModule: true, default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
});
const search = load("src/lib/auditoria/search.ts");
const snapshots = load("src/lib/auditoria/snapshots.ts");

test("filtros de URL y paginación se validan sin aceptar expresiones de consulta", () => {
  const valid = search.parseAuditSearch({ desde: "2026-10-10", hasta: "2026-10-11", modulo: " configuracion ", page: "2", usuario: " OPERATOR@EXAMPLE.TEST " });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.search.filters, { desde: "2026-10-10", hasta: "2026-10-11", modulo: "configuracion", usuario: "operator@example.test" });
  assert.equal(valid.search.page, 2);
  const href = search.auditHref(valid.search.filters, 2);
  assert.equal(new URL(href, "http://localhost").searchParams.get("usuario"), "operator@example.test");
  assert.equal(new URL(href, "http://localhost").searchParams.get("page"), "2");
  for (const params of [
    { desde: "2026-02-30" }, { desde: "2026-10-11", hasta: "2026-10-10" },
    { modulo: ["uno", "dos"] }, { page: "0" }, { page: "999999999999999999" },
    { detalle: "not-an-id" }, { accion: "x".repeat(81) }, { usuario: "correo-invalido" },
  ]) assert.equal(search.parseAuditSearch(params).valid, false, JSON.stringify(params));
  assert.deepEqual(search.parseAuditSearch({ "modulo[not]": "configuracion" }).search.filters, {});
});

test("límites de día civil chileno incluyen cambios de horario", () => {
  for (const day of ["2026-04-05", "2026-09-06", "2026-10-10"]) {
    const start = search.startOfSantiagoDay(day);
    const next = search.startOfSantiagoDay(search.nextIsoDate(day));
    assert.ok(next > start);
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(start);
    const local = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    assert.equal(`${local.year}-${local.month}-${local.day}`, day);
  }
});

test("comparación JSON distingue agregados, eliminados, modificados y sin cambios", () => {
  const changes = snapshots.compareSnapshots(
    { keep: { a: 1, b: [2] }, removed: null, changed: 1 },
    { keep: { b: [2], a: 1 }, added: "nuevo", changed: 2 },
  );
  assert.deepEqual(Object.fromEntries(changes.map((row) => [row.field, row.kind])), {
    added: "added", changed: "changed", keep: "unchanged", removed: "removed",
  });
  assert.equal(snapshots.compareSnapshots(null, { a: 1 }), null);
  assert.equal(snapshots.compareSnapshots([1], [1]), null);
  assert.equal(snapshots.jsonText(null), "null");
});

test("detalle representa snapshots nulos y texto especial sin interpretar HTML", () => {
  const { AuditDetailPanel } = load("src/components/auditoria/audit-detail.tsx");
  const base = {
    id: "62663779-82fc-4b31-9541-ed8bb5cc6200", fecha: new Date("2026-10-10T12:00:00Z"),
    actorEmail: "<script>alert(1)</script>", modulo: "configuracion", accion: "CREATE", entidad: "piscicultura",
    entidadId: null, antes: null, despues: { name: "<img src=x onerror=alert(1)>" },
  };
  const html = renderToStaticMarkup(React.createElement(AuditDetailPanel, { record: base, search: { filters: {}, page: 1 } }));
  assert.ok(html.includes("null"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&lt;img"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
});

test("consultas privadas rechazan antes de tocar Prisma", async () => {
  let accessed = 0;
  const guarded = moduleLoader({
    "@/lib/auth": { requireAuthorizedUser: async () => { throw new Error("UNAUTHORIZED"); } },
    "@/lib/prisma": { prisma: { auditoria: { count: async () => { accessed++; }, findUnique: async () => { accessed++; } } } },
  })("src/lib/auditoria/data.ts");
  await assert.rejects(guarded.listAuditRecords({ filters: {}, page: 1 }), /UNAUTHORIZED/);
  await assert.rejects(guarded.getAuditDetail("62663779-82fc-4b31-9541-ed8bb5cc6200"), /UNAUTHORIZED/);
  assert.equal(accessed, 0);
});
