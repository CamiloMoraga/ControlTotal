import { test } from "node:test";
import assert from "node:assert/strict";
import { intersects, operationalWindow, santiagoInstant } from "./window.mjs";

test("ventana chilena semiabierta y cruce de medianoche", () => {
  const window = operationalWindow("2026-10-10", "08:00", "08:00");
  assert.equal(window.start.toISOString(), "2026-10-09T11:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-10-10T11:00:00.000Z");
  assert.equal(intersects(window.end, null, window), false);
  assert.equal(intersects(new Date(window.start.getTime() - 1), window.start, window), false);
  assert.equal(intersects(window.start, window.end, window), true);
  assert.equal(intersects(santiagoInstant("2026-10-09", "21:00"),
    santiagoInstant("2026-10-11", "03:00"), window), true);
});

test("horario de verano chileno: la ventana conserva instantes reales", () => {
  const window = operationalWindow("2026-09-06", "08:00", "08:00");
  assert.equal((window.end - window.start) / 3600000, 23);
});
