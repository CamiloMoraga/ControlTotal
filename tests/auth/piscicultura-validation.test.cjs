const { test } = require("node:test");
const assert = require("node:assert/strict");
const { moduleLoader } = require("./load-module.cjs");
const { validatePiscicultura, nameKey, PISCICULTURA_LIMITS } = moduleLoader()("src/lib/pisciculturas/validation.ts");

function form(values = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ nombre: "Centro Sur", codigo: "CS_1", orden: "0", notaCamaras: "", ...values })) data.set(key, value);
  return data;
}

test("nombre obligatorio y normalización de espacios", () => {
  assert.ok(validatePiscicultura(form({ nombre: "  \t " })).errors.nombre);
  assert.equal(validatePiscicultura(form({ nombre: "  Centro   Sur  " })).data.nombre, "Centro Sur");
  assert.equal(nameKey("  CENTRO   sur "), nameKey("Centro Sur"));
});

test("código opcional, mayúsculas y caracteres permitidos", () => {
  assert.equal(validatePiscicultura(form({ codigo: " cs_1 " })).data.codigo, "CS_1");
  assert.equal(validatePiscicultura(form({ codigo: "  " })).data.codigo, null);
  for (const codigo of ["CON-GUION", "ÁREA", "A B", "A/B", "ß"]) assert.ok(validatePiscicultura(form({ codigo })).errors.codigo);
});

test("orden entero seguro no negativo dentro de Int de Prisma", () => {
  for (const orden of ["-1", "1.5", "NaN", "2147483648", "9007199254740992", ""]) {
    assert.ok(validatePiscicultura(form({ orden })).errors.orden, orden);
  }
  assert.equal(validatePiscicultura(form({ orden: "2147483647" })).data.orden, 2147483647);
});

test("límites compartidos de nombre, código y nota", () => {
  assert.ok(validatePiscicultura(form({ nombre: "N".repeat(PISCICULTURA_LIMITS.nombre + 1) })).errors.nombre);
  assert.ok(validatePiscicultura(form({ codigo: "C".repeat(PISCICULTURA_LIMITS.codigo + 1) })).errors.codigo);
  assert.ok(validatePiscicultura(form({ notaCamaras: "N".repeat(PISCICULTURA_LIMITS.notaCamaras + 1) })).errors.notaCamaras);
});
