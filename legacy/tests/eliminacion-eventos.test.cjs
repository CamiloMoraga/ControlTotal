// Ejecutar desde la raíz de V2: node legacy/tests/eliminacion-eventos.test.cjs
// Sustituye pruebas del borrado de copias: ahora los arrays diarios son legacy intocable.
const test = require('node:test');
const { entorno, evento, reporte, clone, assert } = require('./helpers/incidencias.cjs');

test('CRÍTICO: eliminar la única fuente canónica; las seis copias legacy no vuelven a aparecer', async () => {
    const fechas=['2026-09-30','2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05'];
    const incidencia=evento({fechaHora:'2026-09-30T06:00'});
    const diarios=Object.fromEntries(fechas.map(fecha=>[fecha,reporte([incidencia])]));
    const env=entorno({diarios,historicos:{incidencia},fecha:'2026-09-30'});await env.cargar();
    const legacy=clone([...env.documentos].filter(([ruta])=>ruta.startsWith('reportes_unificados/')));
    assert.deepEqual(env.ids(),['incidencia']);const antes=env.trace.length;await env.eliminar();
    assert.equal(env.documentos.has('eventos_historicos/incidencia'),false);assert.deepEqual(env.ids(),[]);assert.equal(env.element('evt-incidencia').removed,true);
    assert.deepEqual([...env.documentos],legacy);assert.equal(env.escrituras.length,1);assert.equal(env.escrituras[0].tipo,'delete');
    assert.ok(env.trace.slice(antes).every(op=>!op[1].startsWith('reportes_unificados')));
    for(const fecha of fechas){await env.cargar(fecha);assert.deepEqual(env.ids(),[]);}
    await env.contexto.sincronizarDesdeNube();assert.deepEqual(env.ids(),[]);
    const recarga=entorno({diarios:Object.fromEntries(legacy.map(([ruta,datos])=>[ruta.replace('reportes_unificados/RU_',''),datos]))});
    await recarga.cargar();assert.deepEqual(recarga.ids(),[]);
});

test('Error de eliminación no retira el evento de memoria/UI ni cierra confirmación', async () => {
    const env=entorno({historicos:{incidencia:evento()},fallo:'delete'});await env.cargar();const memoria=clone(env.contexto.datosActuales);
    await env.eliminar();assert.deepEqual(clone(env.contexto.datosActuales),memoria);assert.equal(env.element('evt-incidencia').removed,false);assert.equal(env.modal.hidden,false);assert.equal(env.escrituras.length,0);
});

test('Memoria/UI no cambian antes de confirmar la eliminación canónica', async () => {
    let env, liberar, listo;
    const pendiente=new Promise(resolve=>{listo=resolve;});
    env=entorno({historicos:{incidencia:evento()},antesEscritura:async()=>{assert.deepEqual(env.ids(),['incidencia']);assert.equal(env.element('evt-incidencia').removed,false);listo();await new Promise(resolve=>{liberar=resolve;});}});
    await env.cargar();const eliminacion=env.eliminar();await pendiente;assert.equal(env.documentos.has('eventos_historicos/incidencia'),true);liberar();await eliminacion;assert.deepEqual(env.ids(),[]);
});

test('Super Admin obligatorio para preparar y ejecutar eliminación', async () => {
    const env=entorno({historicos:{incidencia:evento()}});await env.cargar();env.contexto.esSuperAdmin=false;
    env.contexto.prepararEliminacionEvento('incidencia','centroa');env.contexto.accionPendienteSync={tipo:'eliminar',rowId:'incidencia',cId:'centroa'};await env.contexto.ejecutarSyncEvento();
    assert.equal(env.escrituras.length,0);assert.equal(env.documentos.has('eventos_historicos/incidencia'),true);assert.equal(env.alerts.length,2);
});
