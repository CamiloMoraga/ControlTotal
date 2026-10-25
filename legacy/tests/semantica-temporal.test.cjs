// Ejecutar desde la raíz de V2: node legacy/tests/semantica-temporal.test.cjs
// Fechas locales en America/Santiago; Firebase y DOM simulados, sin cambios en producción.
const test = require('node:test');
const { entorno, evento, reporte, clone, assert, vm } = require('./helpers/incidencias.cjs');
function evaluar(env, expresion) { return vm.runInContext(expresion, env.contexto); }

for (const [nombre, fecha, cierre] of [
    ['A','2026-10-05T07:29','2026-10-05'],
    ['B','2026-10-05T07:30','2026-10-06'],
    ['C','2026-10-05T18:00','2026-10-06'],
    ['D','2026-10-06T07:29','2026-10-06'],
    ['E','2026-10-06T07:30','2026-10-07']
]) test('Límite '+nombre+': '+fecha+' → cierre '+cierre, () => {
    const env=entorno();assert.equal(evaluar(env,`calcularFechaReporteOperacional('${fecha}', '07:30')`),cierre);
});

const casos = [
    ['2026-10-05T07:29','2026-10-05T07:30',false],
    ['2026-10-05T07:30','2026-10-05T08:00',true],
    ['2026-10-04T20:00','2026-10-05T07:30',false],
    ['2026-10-04T20:00','2026-10-05T07:31',true],
    ['2026-10-05T20:00','',true],
    ['2026-10-06T07:30','',false]
];
casos.forEach(([inicio,fin,pertenece],index)=>test('Intersección '+(index+1)+': extremos estrictos sin duplicado al corte',async()=>{
    const env=entorno({fecha:'2026-10-06',historicos:{incidencia:evento({fechaHora:inicio,fechaHoraFin:fin,fecha_reporte:'1999-01-01'})}});
    await env.cargar();assert.equal(env.ids().includes('incidencia'),pertenece);
    assert.equal(env.escrituras.length,0); // La metadata errónea no decide la visualización ni se repara al leer.
    if(index===5){await env.cargar('2026-10-07');assert.deepEqual(env.ids(),['incidencia']);}
}));

test('Período y cabecera: cierre 06/10 significa 05/10 07:30 → 06/10 07:30 local',async()=>{
    const env=entorno({fecha:'2026-10-06'});await env.cargar();
    const periodo=evaluar(env,"obtenerPeriodoReporte('2026-10-06','07:30','07:30')");
    assert.equal(evaluar(env,"formatearFechaHoraLocal(obtenerPeriodoReporte('2026-10-06','07:30','07:30').inicio)"),'2026-10-05T07:30');
    assert.equal(evaluar(env,"formatearFechaHoraLocal(obtenerPeriodoReporte('2026-10-06','07:30','07:30').fin)"),'2026-10-06T07:30');
    assert.ok(periodo.fin>periodo.inicio);
    assert.equal(env.element('ru-lbl-fecha-ini').innerText,'05/10/2026');assert.equal(env.element('ru-lbl-fecha-fin').innerText,'06/10/2026');
});

test('Prueba operacional completa: 05/10 15:00 abierta en cierre 06/10, recarga, fechas y cierre 06/10 06:00',async()=>{
    const env=entorno({fecha:'2026-10-06'});await env.cargar();
    const incidencia=evento({fechaHora:'2026-10-05T15:00'});await env.guardarIncidencia(incidencia);
    assert.equal(env.documentos.get('eventos_historicos/incidencia').fecha_reporte,'2026-10-06');
    assert.equal(env.documentos.get('eventos_historicos/incidencia').fechaHora,'2026-10-05T15:00');
    assert.deepEqual(env.ids(),['incidencia']);await env.cargar();assert.deepEqual(env.ids(),['incidencia']);
    await env.cargar('2026-10-05');assert.deepEqual(env.ids(),[]);await env.cargar('2026-10-06');assert.deepEqual(env.ids(),['incidencia']);
    await env.guardarIncidencia({...incidencia,fechaHoraFin:'2026-10-06T06:00'});assert.deepEqual(env.ids(),['incidencia']);
    await env.cargar('2026-10-07');assert.deepEqual(env.ids(),[]);
    const recarga=entorno({fecha:'2026-10-06',historicos:{incidencia:env.documentos.get('eventos_historicos/incidencia')}});await recarga.cargar();assert.deepEqual(recarga.ids(),['incidencia']);
    assert.equal(env.documentos.size,1);assert.ok(env.escrituras.every(op=>op.ruta==='eventos_historicos/incidencia'));
});

test('Caso normal 05/10 18:20: metadata de cierre 06/10 e inicio manual intacto',async()=>{
    const env=entorno({fecha:'2026-10-06'});await env.cargar();await env.guardarIncidencia(evento({fechaHora:'2026-10-05T18:20'}));
    const guardado=env.documentos.get('eventos_historicos/incidencia');assert.equal(guardado.fechaHora,'2026-10-05T18:20');assert.equal(guardado.fecha_reporte,'2026-10-06');assert.deepEqual(env.ids(),['incidencia']);
});

test('Caso retroactivo finalizado: creado desde 06/10 aparece sólo en reporte 04/10',async()=>{
    const env=entorno({fecha:'2026-10-06'});await env.cargar();
    await env.guardarIncidencia(evento({fechaHora:'2026-10-03T21:00',fechaHoraFin:'2026-10-03T22:30'}));
    const guardado=env.documentos.get('eventos_historicos/incidencia');assert.equal(guardado.fechaHora,'2026-10-03T21:00');assert.equal(guardado.fechaHoraFin,'2026-10-03T22:30');assert.equal(guardado.fecha_reporte,'2026-10-04');
    assert.deepEqual(env.ids(),[]);assert.ok(env.alerts.includes('La incidencia corresponde al reporte operacional del 04/10/2026.'));
    for(const [dia,esperado] of [['2026-10-04',true],['2026-10-05',false],['2026-10-06',false]]){await env.cargar(dia);assert.equal(env.ids().includes('incidencia'),esperado);}
});

test('Retroactiva abierta aparece en cierres 04/10, 05/10 y 06/10; cierre 05/10 10:00 excluye 07/10',async()=>{
    const env=entorno({fecha:'2026-10-06'});await env.cargar();const incidencia=evento({fechaHora:'2026-10-03T21:00'});await env.guardarIncidencia(incidencia);
    for(const dia of ['2026-10-04','2026-10-05','2026-10-06']){await env.cargar(dia);assert.deepEqual(env.ids(),['incidencia']);}
    await env.guardarIncidencia({...incidencia,fechaHoraFin:'2026-10-05T10:00'});
    for(const [dia,esperado] of [['2026-10-04',true],['2026-10-05',true],['2026-10-06',true],['2026-10-07',false]]){await env.cargar(dia);assert.equal(env.ids().includes('incidencia'),esperado);}
    assert.equal(env.documentos.size,1);
});

test('Editar inicio recalcula fecha_reporte; comentarios y cierre no alteran los instantes',async()=>{
    const env=entorno({fecha:'2026-10-06',historicos:{incidencia:evento({fechaHora:'2026-10-05T18:00',fecha_reporte:'2026-10-06'})}});await env.cargar();
    await env.guardarIncidencia(evento({fechaHora:'2026-10-05T18:00',comentario:'Nuevo comentario'}));
    let guardado=env.documentos.get('eventos_historicos/incidencia');assert.equal(guardado.fechaHora,'2026-10-05T18:00');assert.equal(guardado.fechaHoraFin,'');assert.equal(guardado.fecha_reporte,'2026-10-06');
    await env.guardarIncidencia(evento({fechaHora:'2026-10-04T18:00',fechaHoraFin:'2026-10-05T10:00'}));
    guardado=env.documentos.get('eventos_historicos/incidencia');assert.equal(guardado.fecha_reporte,'2026-10-05');assert.equal(guardado.fechaHora,'2026-10-04T18:00');assert.equal(guardado.fechaHoraFin,'2026-10-05T10:00');
});

for(const [fin,mensaje] of [['2026-10-05T17:59',/anterior al inicio/],['2026-10-05T18:00',/duración cero/],['2026-02-31T18:30',/término válida/]])test('Rechaza término '+fin+' antes de escribir, con mensaje claro',async()=>{
    const env=entorno({fecha:'2026-10-06'});await env.cargar();await env.guardarIncidencia(evento({fechaHora:'2026-10-05T18:00',fechaHoraFin:fin}));
    assert.equal(env.escrituras.length,0);assert.deepEqual(env.ids(),[]);assert.equal(env.modal.hidden,false);assert.match(env.alerts[0],mensaje);assert.equal(env.element('btn-confirmar-sync').disabled,false);
});

test('Rechaza inicio inválido; cierre negativo/cero legacy se excluye sin modificar documentos',async()=>{
    const env=entorno({fecha:'2026-10-06'});await env.cargar();await env.guardarIncidencia(evento({fechaHora:'2026-02-31T18:00'}));assert.equal(env.escrituras.length,0);assert.match(env.alerts[0],/inicio válida/);
    const antiguos=entorno({fecha:'2026-10-06',historicos:{cero:evento({id:'cero',fechaHora:'2026-10-05T18:00',fechaHoraFin:'2026-10-05T18:00'}),negativa:evento({id:'negativa',fechaHora:'2026-10-05T18:00',fechaHoraFin:'2026-10-05T17:59'})}});
    const original=clone([...antiguos.documentos]);await antiguos.cargar();assert.deepEqual(antiguos.ids(),[]);assert.deepEqual([...antiguos.documentos],original);assert.ok(antiguos.logs.some(log=>log[1].includes('Duración no positiva')));
});

test('Fecha operacional local: UTC en 06/10 todavía puede corresponder al cierre 06/10 desde el 05/10 local',()=>{
    const env=entorno();assert.equal(evaluar(env,"formatearFechaLocal(new Date('2026-10-06T02:30:00Z'))"),'2026-10-05');
    assert.equal(evaluar(env,"calcularFechaReporteOperacional(new Date('2026-10-06T02:30:00Z'),'07:30')"),'2026-10-06');
    assert.equal(evaluar(env,"calcularFechaReporteOperacional('2026-10-05T07:29:59.999','07:30')"),'2026-10-05');
    assert.equal(evaluar(env,"calcularFechaReporteOperacional('2026-10-05T07:30:00.001','07:30')"),'2026-10-06');
});

test('Corte configurado y cambio de mes/año usan calendario local',()=>{
    const env=entorno();assert.equal(evaluar(env,"calcularFechaReporteOperacional('2026-10-05T08:00','08:00')"),'2026-10-06');
    assert.equal(evaluar(env,"calcularFechaReporteOperacional('2026-10-05T07:59','08:00')"),'2026-10-05');
    assert.equal(evaluar(env,"calcularFechaReporteOperacional('2026-12-31T18:00','07:30')"),'2027-01-01');
    assert.equal(evaluar(env,"formatearFechaLocal(obtenerPeriodoReporte('2027-01-01','07:30','07:30').inicio)"),'2026-12-31');
});
