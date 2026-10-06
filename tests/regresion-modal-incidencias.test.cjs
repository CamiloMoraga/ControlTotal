// Ejecutar: node tests/regresion-modal-incidencias.test.cjs
// Validación lógica con DOM/Firebase simulados; no conecta a producción.
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { entorno, evento, assert } = require('./helpers/incidencias.cjs');
const eliminados = ['chk-sync-diario', 'chk-sync-historico'];
function sinCheckbox(env) {
    const obtener = env.contexto.document.getElementById;
    env.contexto.document.getElementById = id => eliminados.includes(id) ? null : obtener(id);
}

test('Código activo y HTML tienen cero referencias a destinos de sincronización selectiva', () => {
    const raiz = path.join(__dirname, '..');
    const archivos = ['index.html', ...fs.readdirSync(path.join(raiz, 'assets/js')).filter(nombre => nombre.endsWith('.js')).map(nombre => 'assets/js/' + nombre)];
    for (const archivo of archivos) assert.doesNotMatch(fs.readFileSync(path.join(raiz, archivo), 'utf8'), /chk-sync-diario|chk-sync-historico|syncDiario|syncHistorico/i, archivo);
});

test('Eliminar sin checkbox: abre y reutiliza el modal, confirma un único borrado canónico', async () => {
    const env = entorno({ historicos: { incidencia: evento() } }); await env.cargar(); sinCheckbox(env);
    let aperturas = 0;
    const obtener = env.contexto.bootstrap.Modal.getOrCreateInstance;
    env.contexto.bootstrap.Modal.getOrCreateInstance = modal => { aperturas++; return obtener(modal); };
    for (let i = 0; i < 3; i++) {
        assert.doesNotThrow(() => env.contexto.prepararEliminacionEvento('incidencia', 'centroa'));
        assert.match(env.element('msg-sync-evento').innerHTML, /ELIMINAR PERMANENTEMENTE/);
        assert.equal(env.contexto.accionPendienteSync.tipo, 'eliminar');
        env.modal.hide();
    }
    await env.eliminar();
    assert.equal(aperturas, 5); // 4 aperturas y 1 cierre usan la misma instancia.
    assert.deepEqual(env.ids(), []); assert.equal(env.escrituras.length, 1);
    assert.equal(env.escrituras[0].ruta, 'eventos_historicos/incidencia');
    assert.equal(env.escrituras[0].tipo, 'delete');
    assert.equal(env.logs.some(log => log[0] === 'error'), false);
});

test('Editar, guardar edición y cerrar sin checkbox inexistentes', async () => {
    const env = entorno({ historicos: { incidencia: evento() } }); await env.cargar(); sinCheckbox(env);
    assert.doesNotThrow(() => env.contexto.editarFilaEvento('incidencia', 'centroa'));
    assert.match(env.element('evt-incidencia').innerHTML, /fec_fin_incidencia/);
    await env.guardarIncidencia(evento({ comentario: 'Edición confirmada' }));
    assert.equal(env.documentos.get('eventos_historicos/incidencia').comentario, 'Edición confirmada');
    env.contexto.editarFilaEvento('incidencia', 'centroa');
    await env.guardarIncidencia(evento({ comentario: 'Cerrada', fechaHoraFin: '2026-10-05T06:00' }));
    assert.equal(env.documentos.get('eventos_historicos/incidencia').fechaHoraFin, '2026-10-05T06:00');
    assert.ok(env.escrituras.every(op => op.tipo === 'update' && op.ruta === 'eventos_historicos/incidencia'));
    assert.equal(env.logs.some(log => log[0] === 'error'), false);
});

test('Ocultar/mostrar Foto sigue siendo una actualización histórica por acción', async () => {
    const env = entorno({ historicos: { incidencia: evento() } }); await env.cargar(); sinCheckbox(env);
    const btn = env.element('foto'); btn.icon.classList.add('bi-eye'); btn.classList.add('btn-outline-secondary');
    await env.contexto.toggleVisibilidadCuracion(btn, 'incidencia', 'centroa');
    assert.equal(env.documentos.get('eventos_historicos/incidencia').oculto, true);
    await env.contexto.toggleVisibilidadCuracion(btn, 'incidencia', 'centroa');
    assert.equal(env.documentos.get('eventos_historicos/incidencia').oculto, false);
    assert.equal(env.escrituras.length, 2); assert.equal(env.logs.some(log => log[0] === 'error'), false);
});

test('Cancelar modal sólo cierra la confirmación, sin escrituras', async () => {
    const env = entorno({ historicos: { incidencia: evento() } }); await env.cargar(); sinCheckbox(env);
    env.contexto.prepararEliminacionEvento('incidencia', 'centroa'); env.modal.hide();
    assert.equal(env.escrituras.length, 0); assert.deepEqual(env.ids(), ['incidencia']);
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const modal = html.slice(html.indexOf('id="modalSyncEvento"'), html.indexOf('id="modalMatrizEstanques"'));
    assert.match(modal, /data-bs-dismiss="modal">Cancelar/);
    assert.match(modal, /onclick="window.ejecutarSyncEvento\(\)"/);
});

test('Mensaje auxiliar ausente registra advertencia y permite abrir confirmación', async () => {
    const env = entorno({ historicos: { incidencia: evento() } }); await env.cargar();
    const obtener = env.contexto.document.getElementById;
    env.contexto.document.getElementById = id => id === 'msg-sync-evento' ? null : obtener(id);
    assert.doesNotThrow(() => env.contexto.prepararEliminacionEvento('incidencia', 'centroa'));
    assert.equal(env.modal.shown, true); assert.ok(env.logs.some(log => log[0] === 'warn'));
});

for (const ausente of ['modalSyncEvento', 'btn-confirmar-sync']) {
    test('Elemento esencial ausente: ' + ausente + ' produce diagnóstico y ninguna escritura', async () => {
        const env = entorno({ historicos: { incidencia: evento() } }); await env.cargar();
        const obtener = env.contexto.document.getElementById;
        env.contexto.document.getElementById = id => id === ausente ? null : obtener(id);
        assert.doesNotThrow(() => env.contexto.prepararEliminacionEvento('incidencia', 'centroa'));
        await env.contexto.ejecutarSyncEvento();
        assert.equal(env.escrituras.length, 0); assert.deepEqual(env.ids(), ['incidencia']);
        assert.ok(env.logs.some(log => log[0] === 'error')); assert.ok(env.alerts.length);
    });
}
