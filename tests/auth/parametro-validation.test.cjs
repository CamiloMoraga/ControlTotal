const { test } = require("node:test");
const assert = require("node:assert/strict");
const { moduleLoader } = require("./load-module.cjs");
const { validateParametro, nameKey, PARAMETRO_LIMITS } = moduleLoader()("src/lib/parametros/validation.ts");
const { filterParametros } = moduleLoader()("src/lib/parametros/filters.ts");

function form(values = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ codigo: "O2_TEST", nombre: "Oxígeno de prueba", unidad: "mg/L", orden: "0", ...values })) data.set(key, value);
  return data;
}

test("creación válida, código obligatorio y normalizado", () => {
  assert.deepEqual(validateParametro(form({ codigo: " o2_test " })).data, {
    codigo: "O2_TEST", nombre: "Oxígeno de prueba", unidad: "mg/L", orden: 0,
  });
  assert.ok(validateParametro(form({ codigo: "  " })).errors.codigo);
  for (const codigo of ["A-B", "ÁREA", "A B", "A/B", "ß", "A".repeat(PARAMETRO_LIMITS.codigo + 1)]) {
    assert.ok(validateParametro(form({ codigo })).errors.codigo, codigo);
  }
});

test("nombre obligatorio y normalización de espacios", () => {
  assert.ok(validateParametro(form({ nombre: " \t " })).errors.nombre);
  assert.equal(validateParametro(form({ nombre: "  Oxígeno   disuelto " })).data.nombre, "Oxígeno disuelto");
  assert.equal(nameKey("  OXÍGENO    disuelto "), nameKey("Oxígeno disuelto"));
  assert.ok(validateParametro(form({ nombre: "N".repeat(PARAMETRO_LIMITS.nombre + 1) })).errors.nombre);
});

test("unidad Unicode opcional y orden entero no negativo", () => {
  for (const unidad of ["°C", "%", "µg/L", "mg·L⁻¹"]) assert.equal(validateParametro(form({ unidad })).data.unidad, unidad);
  assert.equal(validateParametro(form({ unidad: "  " })).data.unidad, null);
  assert.ok(validateParametro(form({ unidad: "x".repeat(PARAMETRO_LIMITS.unidad + 1) })).errors.unidad);
  for (const orden of ["-1", "1.5", "NaN", "2147483648", "9007199254740992", ""]) {
    assert.ok(validateParametro(form({ orden })).errors.orden, orden);
  }
  assert.equal(validateParametro(form({ orden: "2147483647" })).data.orden, 2147483647);
  const withoutOrder = new FormData();
  withoutOrder.set("codigo", "NUEVO"); withoutOrder.set("nombre", "Nuevo");
  assert.equal(validateParametro(withoutOrder).data.orden, 0);
});

test("filtros de listado por estado", () => {
  const rows = [{ activo: true }, { activo: false }];
  assert.equal(filterParametros(rows, "todos").length, 2);
  assert.deepEqual(filterParametros(rows, "activos"), [rows[0]]);
  assert.deepEqual(filterParametros(rows, "inactivos"), [rows[1]]);
});
