const { test } = require("node:test");
const assert = require("node:assert/strict");
const { moduleLoader } = require("./load-module.cjs");

test("validación de los cinco catálogos", () => {
  const { validateCatalog, normalizeName } = moduleLoader()("src/lib/event-catalogs/validation.ts");
  const form = (nombre, orden, motivoId = "") => {
    const data = new FormData(); data.set("nombre", nombre); data.set("orden", orden); data.set("motivoId", motivoId); return data;
  };
  for (const kind of ["categorias", "condiciones", "areas", "motivos"]) {
    assert.deepEqual(validateCatalog(kind, form("   ", "0")).errors.nombre, "Ingresa un nombre.");
    assert.equal(validateCatalog(kind, form("  Agua\tfría  ", "2")).data.nombre, "Agua fría");
    for (const invalid of ["-1", "1.2", "2147483648", "", "Infinity"]) {
      assert.ok(validateCatalog(kind, form("Nombre", invalid)).errors.orden);
    }
  }
  assert.equal(normalizeName("  Uno  dos  "), "Uno dos");
  assert.ok(validateCatalog("submotivos", form("Uno", "0")).errors.motivoId);
  assert.ok(validateCatalog("submotivos", form("Uno", "0", "xyz")).errors.motivoId);
  assert.equal(validateCatalog("submotivos", form("Uno", "0", "96b516de-4cf6-454b-b558-241844258d84")).data.motivoId,
    "96b516de-4cf6-454b-b558-241844258d84");
});

test("acciones y consultas rechazan usuarios no autorizados antes de Prisma", async () => {
  let calls = 0;
  const load = moduleLoader({
    "@/lib/auth": { requireAuthorizedUser: async () => { throw new Error("UNAUTHORIZED"); } },
    "@/lib/prisma": { prisma: new Proxy({}, { get: () => { calls++; throw new Error("DATABASE"); } }) },
    "@/lib/event-catalogs/writes": { createCatalog: () => { calls++; }, updateCatalog: () => { calls++; }, setCatalogState: () => { calls++; } },
    "@/lib/event-catalogs/query": { queryCatalog: () => { calls++; }, queryMotivos: () => { calls++; } },
    "next/cache": { revalidatePath: () => {} },
  });
  const actions = load("src/app/(app)/configuracion/event-catalog-actions.ts");
  const data = new FormData(); data.set("nombre", "Prueba"); data.set("orden", "0");
  await assert.rejects(actions.saveEventCatalog("categorias", null, { ok: null, message: "", errors: {} }, data), /UNAUTHORIZED/);
  await assert.rejects(actions.changeEventCatalogState("categorias", "96b516de-4cf6-454b-b558-241844258d84", false), /UNAUTHORIZED/);
  const query = load("src/lib/event-catalogs/data.ts");
  await assert.rejects(query.listCatalog("categorias"), /UNAUTHORIZED/);
  await assert.rejects(query.listMotivosForCatalog(), /UNAUTHORIZED/);
  assert.equal(calls, 0);
});
