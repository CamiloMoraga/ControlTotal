import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { expectConstraint, snapshot, testClient, withRollback } from "./helpers";
import { intersects, operationalWindow, santiagoInstant } from "./window.mjs";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const time = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);

test("PostgreSQL local y relaciones Prisma: todas las escrituras se revierten", async (t) => {
  const db = testClient();
  try {
    await assert.doesNotReject(db.$queryRaw`SELECT 1 AS ok`);
  } catch {
    await db.$disconnect();
    throw new Error("PostgreSQL local no está disponible en localhost:5434/controltotal_dev");
  }

  try {
    const before = await snapshot(db);
    const pisciculturas = await db.piscicultura.findMany({ orderBy: { orden: "asc" } });
    const parametros = await db.parametro.findMany({ orderBy: { orden: "asc" } });
    assert.ok(pisciculturas.length >= 2 && parametros.length >= 1,
      "Faltan datos maestros de pisciculturas o parámetros");
    console.log(`Maestros iniciales: ${pisciculturas.length} pisciculturas, ${parametros.length} parámetros`);
    const [pic1, pic2] = pisciculturas;
    const parametro = parametros[0];

    await t.test("A: muestras, mediciones, precisión, unicidad y cascade", async () => {
      await withRollback(db, async (tx) => {
        await expectConstraint(tx, () => tx.piscicultura.create({ data: {
          nombre: pic1.nombre,
        } }), ["P2002", "23505"]);
        await expectConstraint(tx, () => tx.parametro.create({ data: {
          codigo: parametro.codigo, nombre: "DB_TEST",
        } }), ["P2002", "23505"]);
        const jornada = await tx.jornadaParametros.create({ data: {
          pisciculturaId: pic1.id, fecha: date("2099-10-10"), responsable: "DB_TEST",
        } });
        await expectConstraint(tx, () => tx.jornadaParametros.create({ data: {
          pisciculturaId: pic1.id, fecha: jornada.fecha,
        } }), ["P2002", "23505"]);
        const hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];
        for (const [index, hour] of hours.entries()) {
          const system = index % 3 === 0 ? "HATCHERY" : index % 3 === 1 ? "FRY" : "ONGROWING";
          const point = system === "HATCHERY" ? "GENERAL" : system === "FRY" ? "F1" : "ESTANQUE_35";
          const sample = await tx.muestraParametro.create({ data: {
            jornadaId: jornada.id, sistema: system, hora: time(hour),
          } });
          await expectConstraint(tx, () => tx.muestraParametro.create({ data: {
            jornadaId: jornada.id, sistema: system, hora: time(hour),
          } }), ["P2002", "23505"]);
          const measurement = await tx.medicionParametro.create({ data: {
            muestraId: sample.id, parametroId: parametro.id, punto: point, valor: "12.3456",
          } });
          assert.equal(measurement.valor.toString(), "12.3456");
          await expectConstraint(tx, () => tx.medicionParametro.create({ data: {
            muestraId: sample.id, parametroId: parametro.id, punto: point, valor: "1.0000",
          } }), ["P2002", "23505"]);
        }
        const loaded = await tx.medicionParametro.findMany({ where: { muestra: { jornadaId: jornada.id } },
          include: { parametro: true, muestra: { include: { jornada: true } } } });
        assert.equal(loaded.length, 6);
        const grouped = new Map<string, number>();
        for (const row of loaded) {
          const key = `${row.muestra.jornada.fecha.toISOString().slice(0, 10)}:${row.muestra.sistema}:${row.parametro.codigo}`;
          grouped.set(key, (grouped.get(key) ?? 0) + 1);
        }
        assert.equal(grouped.size, 3);
        await expectConstraint(tx, () => tx.parametro.delete({ where: { id: parametro.id } }), ["P2003", "23503"]);
        await tx.jornadaParametros.delete({ where: { id: jornada.id } });
        assert.equal(await tx.muestraParametro.count({ where: { jornadaId: jornada.id } }), 0);
        assert.equal(await tx.medicionParametro.count({ where: { muestra: { jornadaId: jornada.id } } }), 0);
      });
    });

    await t.test("B: estados de cámaras, índice parcial, CHECK y rollback de error", async () => {
      const marker = `DB_TEST_${randomUUID()}`;
      await withRollback(db, async (tx) => {
        const camera = await tx.camara.create({ data: { pisciculturaId: pic1.id, nombre: marker } });
        await expectConstraint(tx, () => tx.camara.create({ data: {
          pisciculturaId: pic1.id, nombre: marker,
        } }), ["P2002", "23505"]);
        assert.equal(await tx.incidenciaCamara.count({ where: { camaraId: camera.id, fin: null } }), 0);
        const start = santiagoInstant("2026-10-09", "21:00");
        const close = santiagoInstant("2026-10-09", "22:00");
        const failure = await tx.incidenciaCamara.create({ data: { camaraId: camera.id, tipo: "FALLA", inicio: start } });
        assert.equal(await tx.incidenciaCamara.count({ where: { camaraId: camera.id, fin: null } }), 1);
        await expectConstraint(tx, () => tx.incidenciaCamara.create({ data: {
          camaraId: camera.id, tipo: "INTERMITENTE", inicio: close,
        } }), ["P2002", "23505"]);
        await expectConstraint(tx, () => tx.$executeRaw`UPDATE incidencia_camara SET fin = ${start} WHERE id = ${failure.id}::uuid`, ["23514"]);
        await expectConstraint(tx, () => tx.$executeRaw`UPDATE incidencia_camara SET fin = ${new Date(start.getTime() - 1000)} WHERE id = ${failure.id}::uuid`, ["23514"]);
        await tx.incidenciaCamara.update({ where: { id: failure.id }, data: { fin: close } });
        assert.equal((close.getTime() - start.getTime()) / 60000, 60);
        const intermittent = await tx.incidenciaCamara.create({ data: {
          camaraId: camera.id, tipo: "INTERMITENTE", inicio: close,
        } });
        await tx.incidenciaCamara.update({ where: { id: intermittent.id }, data: { fin: santiagoInstant("2026-10-09", "23:00") } });
        const secondFailure = await tx.incidenciaCamara.create({ data: {
          camaraId: camera.id, tipo: "FALLA", inicio: santiagoInstant("2026-10-10", "00:00"),
        } });
        await tx.incidenciaCamara.update({ where: { id: secondFailure.id }, data: { fin: santiagoInstant("2026-10-10", "01:00") } });
        assert.equal(await tx.incidenciaCamara.count({ where: { camaraId: camera.id, fin: null } }), 0);
        assert.equal(await tx.incidenciaCamara.count({ where: { camaraId: camera.id } }), 3);
        await expectConstraint(tx, () => tx.camara.delete({ where: { id: camera.id } }), ["P2003", "23503"]);
      });
      const failedCamera = `DB_TEST_${randomUUID()}`;
      await assert.rejects(db.$transaction(async (tx) => {
        const camera = await tx.camara.create({ data: { pisciculturaId: pic1.id, nombre: failedCamera } });
        await tx.incidenciaCamara.create({ data: { camaraId: camera.id, tipo: "FALLA", inicio: new Date() } });
        await tx.incidenciaCamara.create({ data: { camaraId: camera.id, tipo: "FALLA", inicio: new Date() } });
      }));
      assert.equal(await db.camara.count({ where: { nombre: failedCamera } }), 0);
    });

    await t.test("C: reporte diario, FK, unicidad y cascade", async () => {
      await withRollback(db, async (tx) => {
        const report = await tx.reporteDiario.create({ data: { fecha: date("2099-10-10"), turno: "DIA" } });
        await expectConstraint(tx, () => tx.reporteDiario.create({ data: {
          fecha: report.fecha, turno: report.turno,
        } }), ["P2002", "23505"]);
        await tx.reporteDiarioPiscicultura.createMany({ data: [
          { reporteId: report.id, pisciculturaId: pic1.id },
          { reporteId: report.id, pisciculturaId: pic2.id },
        ] });
        assert.equal(await tx.reporteDiarioPiscicultura.count({ where: { reporteId: report.id } }), 2);
        await expectConstraint(tx, () => tx.reporteDiarioPiscicultura.create({ data: {
          reporteId: report.id, pisciculturaId: pic1.id,
        } }), ["P2002", "23505"]);
        await expectConstraint(tx, () => tx.reporteDiarioPiscicultura.create({ data: {
          reporteId: report.id, pisciculturaId: randomUUID(),
        } }), ["P2003", "23503"]);
        await tx.reporteDiario.delete({ where: { id: report.id } });
        assert.equal(await tx.reporteDiarioPiscicultura.count({ where: { reporteId: report.id } }), 0);
      });
    });

    await t.test("D/E/G: ventana unificada, evento multijornada, catálogos y motivos", async () => {
      await withRollback(db, async (tx) => {
        const report = await tx.reporteUnificado.create({ data: {
          fechaEmision: date("2099-10-10"), horaInicio: time("08:00"),
          horaFin: time("08:00"), responsables: ["DB_TEST"],
        } });
        assert.equal(report.fechaEmision.toISOString().slice(0, 10), "2099-10-10");
        assert.equal(report.horaInicio.toISOString().slice(11, 19), "08:00:00");
        await expectConstraint(tx, () => tx.reporteUnificado.create({ data: {
          fechaEmision: report.fechaEmision, horaInicio: time("08:00"),
          horaFin: time("08:00"), responsables: [],
        } }), ["P2002", "23505"]);
        await tx.reporteUnificadoPiscicultura.createMany({ data: [
          { reporteId: report.id, pisciculturaId: pic1.id },
          { reporteId: report.id, pisciculturaId: pic2.id },
        ] });
        await expectConstraint(tx, () => tx.reporteUnificadoPiscicultura.create({ data: {
          reporteId: report.id, pisciculturaId: pic1.id,
        } }), ["P2002", "23505"]);
        const motivoA = await tx.motivoEvento.create({ data: { nombre: `DB_TEST_A_${randomUUID()}` } });
        const motivoB = await tx.motivoEvento.create({ data: { nombre: `DB_TEST_B_${randomUUID()}` } });
        const submotivo = await tx.submotivoEvento.create({ data: { motivoId: motivoA.id, nombre: "DB_TEST" } });
        const [categoria, condicion, area] = await Promise.all([
          tx.categoriaEvento.findFirstOrThrow(), tx.condicionEvento.findFirstOrThrow(), tx.areaOperacional.findFirstOrThrow(),
        ]);
        const start = santiagoInstant("2026-10-09", "21:00");
        const end = santiagoInstant("2026-10-11", "03:00");
        const event = await tx.eventoOperacional.create({ data: {
          pisciculturaId: pic1.id, inicio: start, fin: end, motivoId: motivoA.id,
          submotivoId: submotivo.id, categoriaId: categoria.id, condicionId: condicion.id,
          areaId: area.id, parametroId: parametro.id, reporteOrigenId: null,
          estanques: { create: [{ estanque: "35" }, { estanque: "36" }] },
        }, include: { estanques: true } });
        assert.equal(event.estanques.length, 2);
        assert.equal(event.reporteOrigenId, null);
        const reloadedEvent = await tx.eventoOperacional.findUniqueOrThrow({ where: { id: event.id } });
        assert.equal(reloadedEvent.inicio.toISOString(), start.toISOString());
        assert.equal(reloadedEvent.fin?.toISOString(), end.toISOString());
        assert.equal(await tx.eventoOperacional.count({ where: { id: event.id } }), 1);
        const first = operationalWindow("2026-10-10", "08:00", "08:00");
        const second = operationalWindow("2026-10-11", "08:00", "08:00");
        for (const window of [first, second]) {
          const matching = await tx.eventoOperacional.count({ where: {
            id: event.id, inicio: { lt: window.end }, OR: [{ fin: null }, { fin: { gt: window.start } }],
          } });
          assert.equal(matching, 1);
          assert.equal(intersects(start, end, window), true);
        }
        await expectConstraint(tx, () => tx.$executeRaw`UPDATE evento_operacional SET fin = ${start} WHERE id = ${event.id}::uuid`, ["23514"]);
        await expectConstraint(tx, () => tx.$executeRaw`UPDATE evento_operacional SET fin = ${new Date(start.getTime() - 1000)} WHERE id = ${event.id}::uuid`, ["23514"]);
        await expectConstraint(tx, () => tx.eventoOperacional.create({ data: {
          pisciculturaId: randomUUID(), inicio: start,
        } }), ["P2003", "23503"]);
        for (const field of ["motivoId", "submotivoId", "categoriaId", "parametroId", "condicionId", "areaId"] as const) {
          await expectConstraint(tx, () => tx.eventoOperacional.create({ data: {
            pisciculturaId: pic1.id, inicio: start, [field]: randomUUID(),
          } }), ["P2003", "23503"]);
        }
        await expectConstraint(tx, () => tx.eventoEstanque.create({ data: {
          eventoId: event.id, estanque: "35",
        } }), ["P2002", "23505"]);
        const atEnd = await tx.eventoOperacional.create({ data: { pisciculturaId: pic1.id, inicio: first.end } });
        const endingAtStart = await tx.eventoOperacional.create({ data: {
          pisciculturaId: pic1.id, inicio: new Date(first.start.getTime() - 1), fin: first.start,
        } });
        for (const id of [atEnd.id, endingAtStart.id]) {
          assert.equal(await tx.eventoOperacional.count({ where: { id,
            inicio: { lt: first.end }, OR: [{ fin: null }, { fin: { gt: first.start } }],
          } }), 0);
        }
        // Current schema validates both FKs independently, but accepts a mismatched pair.
        const mismatched = await tx.eventoOperacional.create({ data: {
          pisciculturaId: pic1.id, inicio: start, motivoId: motivoB.id, submotivoId: submotivo.id,
        } });
        assert.equal(mismatched.motivoId, motivoB.id);
        const submotivoOnly = await tx.eventoOperacional.create({ data: {
          pisciculturaId: pic1.id, inicio: start, submotivoId: submotivo.id,
        } });
        assert.equal(submotivoOnly.motivoId, null);
        await expectConstraint(tx, () => tx.motivoEvento.delete({ where: { id: motivoB.id } }), ["P2003", "23503"]);
        await tx.eventoOperacional.update({ where: { id: mismatched.id }, data: { reporteOrigenId: report.id } });
        await expectConstraint(tx, () => tx.reporteUnificado.delete({ where: { id: report.id } }), ["P2003", "23503"]);
        await tx.eventoOperacional.update({ where: { id: mismatched.id }, data: { reporteOrigenId: null } });
        await tx.eventoOperacional.delete({ where: { id: event.id } });
        assert.equal(await tx.eventoEstanque.count({ where: { eventoId: event.id } }), 0);
        await tx.reporteUnificado.delete({ where: { id: report.id } });
        assert.equal(await tx.reporteUnificadoPiscicultura.count({ where: { reporteId: report.id } }), 0);
      });
    });

    const after = await snapshot(db);
    assert.deepEqual(after, before, "Las pruebas alteraron datos persistentes");
    console.log(`Conteos finales idénticos en las ${Object.keys(before).length} tablas`);
    console.log(JSON.stringify(after));
  } finally {
    await db.$disconnect();
  }
});
