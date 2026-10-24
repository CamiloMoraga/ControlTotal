const { test } = require("node:test");
const assert = require("node:assert/strict");
const { moduleLoader } = require("./load-module.cjs");

function form() {
  const data = new FormData();
  data.set("codigo", "PRUEBA"); data.set("nombre", "Prueba"); data.set("orden", "0");
  return data;
}

test("acciones de parámetros rechazan usuarios no autorizados antes de acceder a Prisma", async () => {
  let databaseCalls = 0;
  const load = moduleLoader({
    "@/lib/auth": { requireAuthorizedUser: async () => { throw new Error("UNAUTHORIZED"); } },
    "@/lib/prisma": { prisma: {} },
    "@/lib/parametros/writes": {
      createParametro: async () => { databaseCalls++; },
      updateParametro: async () => { databaseCalls++; },
      setParametroActivo: async () => { databaseCalls++; },
    },
    "next/cache": { revalidatePath: () => {} },
  });
  const actions = load("src/app/(app)/configuracion/parametro-actions.ts");
  await assert.rejects(actions.saveParametro(null, { ok: null, message: "", errors: {} }, form()), /UNAUTHORIZED/);
  await assert.rejects(actions.changeParametroState("96b516de-4cf6-454b-b558-241844258d84", false), /UNAUTHORIZED/);
  assert.equal(databaseCalls, 0);
});

test("listado de parámetros exige autorización antes de consultar", async () => {
  let databaseCalls = 0;
  const load = moduleLoader({
    "@/lib/auth": { requireAuthorizedUser: async () => { throw new Error("UNAUTHORIZED"); } },
    "@/lib/prisma": { prisma: { parametro: { findMany: async () => { databaseCalls++; return []; } } } },
  });
  const { listParametros } = load("src/lib/parametros/data.ts");
  await assert.rejects(listParametros(), /UNAUTHORIZED/);
  assert.equal(databaseCalls, 0);
});
