const { test } = require("node:test");
const assert = require("node:assert/strict");
const { moduleLoader } = require("./load-module.cjs");

function form() {
  const data = new FormData();
  data.set("nombre", "Centro Sur"); data.set("codigo", "CS_1"); data.set("orden", "0");
  return data;
}

test("acción rechaza usuario no autorizado antes de acceder a Prisma", async () => {
  let databaseCalls = 0;
  const load = moduleLoader({
    "@/lib/auth": { requireAuthorizedUser: async () => { throw new Error("UNAUTHORIZED"); } },
    "@/lib/prisma": { prisma: {} },
    "@/lib/pisciculturas/writes": {
      createPiscicultura: async () => { databaseCalls++; },
      updatePiscicultura: async () => { databaseCalls++; },
      setPisciculturaActiva: async () => { databaseCalls++; },
    },
    "next/cache": { revalidatePath: () => {} },
  });
  const actions = load("src/app/(app)/configuracion/actions.ts");
  await assert.rejects(actions.savePiscicultura(null, { ok: null, message: "", errors: {} }, form()), /UNAUTHORIZED/);
  await assert.rejects(actions.changePisciculturaState("96b516de-4cf6-454b-b558-241844258d84", false), /UNAUTHORIZED/);
  assert.equal(databaseCalls, 0);
});
