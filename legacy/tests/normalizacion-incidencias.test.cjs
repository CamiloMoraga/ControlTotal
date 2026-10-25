// Ejecutar desde la raíz de V2: node legacy/tests/normalizacion-incidencias.test.cjs
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { entorno, evento, centro, reporte, clone, assert, vm } = require('./helpers/incidencias.cjs');

test('La carga sólo usa incidencias canónicas, ignorando todos los arrays diarios legacy', async () => {
    const env = entorno({ diarios: { '2026-09-30': reporte([evento({id:'legacyabierta'})]), '2026-10-05': reporte([evento({id:'legacyactual'})]) }, historicos: { canonica: evento({id:'canonica'}) } });
    await env.cargar();
    assert.deepEqual(env.ids(), ['canonica']);
    assert.equal(env.contexto.datosActuales.centroa.cabana, 'Permanencia');
    assert.equal(env.trace.filter(op=>op[0]==='query'&&op[1]==='reportes_unificados').length,0);
    assert.equal(env.trace.filter(op=>op[0]==='get'&&op[1].startsWith('reportes_unificados/')).length,1);
    assert.equal(env.escrituras.length,0);
});

test('Pertenencia al período local 04/10 07:30 → 05/10 07:30, [inicio, fin)', async () => {
    const historicos = {
        abierta: evento({id:'abierta'}), finalizadaAntigua: evento({id:'finalizadaAntigua',fechaHoraFin:'2026-09-30T12:00'}),
        nocturna: evento({id:'nocturna',fechaHora:'2026-10-04T20:00',fechaHoraFin:'2026-10-05T02:00'}),
        fuera: evento({id:'fuera',fechaHora:'2026-10-05T08:00'}),
        limiteInicio: evento({id:'limiteInicio',fechaHora:'2026-10-03T20:00',fechaHoraFin:'2026-10-04T07:30'}),
        limiteFin: evento({id:'limiteFin',fechaHora:'2026-10-05T07:30'})
    };
    const env = entorno({historicos}); await env.cargar();
    assert.deepEqual(env.ids().sort(),['abierta','nocturna']);
    const periodo=vm.runInContext("obtenerPeriodoReporte('2026-10-05','07:30','07:30')",env.contexto);
    assert.equal(periodo.inicio.getDate(),4);assert.equal(periodo.fin.getDate(),5);assert.equal(periodo.inicio.getHours(),7);
});

test('Las horas guardadas mandan; el cambio de hora vuelve a filtrar incidencias sin escribir arrays', async () => {
    const diario = reporte([]);diario.horaInicio='10:00';diario.horaFin='10:00';
    const env=entorno({diarios:{'2026-10-05':diario},historicos:{evento:evento({id:'evento',fechaHora:'2026-10-05T09:00'})}});
    await env.cargar();assert.deepEqual(env.ids(),['evento']);
    env.element('ru-hora-inicio').value='07:30';env.element('ru-hora-fin').value='07:30';
    await env.contexto.guardarReporteUnificado();assert.deepEqual(env.ids(),[]);
    assert.ok(env.escrituras.every(op=>op.ruta.startsWith('reportes_unificados/')));
    assert.ok(!('eventos' in env.escrituras[0].datos.centroa));
});

test('Crear una incidencia escribe una vez en histórico, con metadata y sin tocar diarios', async () => {
    const env=entorno({diarios:{'2026-10-05':reporte([evento({id:'legacy'})])}});
    await env.cargar();const diarios=clone(env.documentos.get('reportes_unificados/RU_2026-10-05'));
    await env.guardarIncidencia(evento());
    assert.deepEqual(env.documentos.get('reportes_unificados/RU_2026-10-05'),diarios);
    assert.equal(env.escrituras.length,1);assert.equal(env.escrituras[0].ruta,'eventos_historicos/incidencia');
    const nuevo=env.documentos.get('eventos_historicos/incidencia');
    assert.equal(nuevo.id_centro,'centroa');assert.equal(nuevo.nombre_centro,'Centro A');assert.equal(nuevo.fecha_reporte,'2026-10-01');
    assert.deepEqual(env.ids(),['incidencia']);
    assert.ok(env.element('evt-incidencia').innerHTML.includes('Falla'));
});

test('Una abierta del 30/09 aparece el 01/10, 02/10 y 05/10 con un único documento físico', async () => {
    const env=entorno({historicos:{incidencia:evento()}});
    for(const dia of ['2026-10-01','2026-10-02','2026-10-05']){await env.cargar(dia);assert.deepEqual(env.ids(),['incidencia']);}
    assert.equal(env.documentos.size,1);assert.equal(env.escrituras.length,0);
});

test('Edición/cierre: una actualización histórica, conserva origen y oculto, respeta superposición posterior', async () => {
    const env=entorno({historicos:{incidencia:evento({oculto:true})}});await env.cargar();
    await env.guardarIncidencia(evento({fechaHoraFin:'2026-10-05T14:35',comentario:'Cerrado'}));
    assert.equal(env.escrituras.length,1);assert.equal(env.escrituras[0].tipo,'update');
    const cerrado=env.documentos.get('eventos_historicos/incidencia');assert.equal(cerrado.fecha_reporte,'2026-10-01');assert.equal(cerrado.oculto,true);
    assert.equal(cerrado.fechaHoraFin,'2026-10-05T14:35');
    await env.cargar('2026-10-06');assert.deepEqual(env.ids(),['incidencia']); // Su cierre está dentro de este período.
    await env.cargar('2026-10-07');assert.deepEqual(env.ids(),[]);
});

test('Datos incompletos se manejan conservadoramente, ID de documento y centro por nombre como fallback', async () => {
    const env=entorno({historicos:{sinFecha:evento({id:undefined,fechaHora:undefined,id_centro:undefined}),invalida:evento({id:'invalida',fechaHora:'2026-02-31T10:00'}),sinCentro:evento({id:'sinCentro',id_centro:'desconocido',nombre_centro:'Desconocido'}),timestamp:evento({id:'timestamp',fechaHora:new Date('2026-10-04T20:00:00-03:00')})}});
    await env.cargar();assert.deepEqual(env.ids().sort(),['invalida','sinFecha','timestamp']);
    assert.equal(env.contexto.datosActuales.centroa.eventos.find(evt=>evt.id==='timestamp').fechaHora,'2026-10-04T20:00');
    assert.ok(env.logs.some(log=>log[0]==='warn'&&log[1].includes('Fecha incompleta')));
    assert.ok(env.logs.some(log=>log[0]==='warn'&&log[1].includes('Centro ausente')));
});

test('Payload diario explícito: modifica campos diarios, preserva arrays legacy y no manda incidencias', async () => {
    const env=entorno({diarios:{'2026-10-05':reporte([evento({id:'legacy'})])},historicos:{incidencia:evento()}});await env.cargar();
    env.element('ru-resp-1').value='Nuevo responsable';
    for(const [id,texto] of [['ru-centroa-cabana','Nueva permanencia'],['ru-centroa-tarde','Nueva tarde'],['ru-centroa-noche','Nueva noche'],['nov-centroa','Nueva novedad']])env.element(id).innerHTML=texto;
    await env.contexto.guardarReporteUnificado();const op=env.escrituras[0];
    assert.equal(op.ruta,'reportes_unificados/RU_2026-10-05');
    assert.deepEqual(Object.keys(op.datos).sort(),['centroa','centrob','horaFin','horaInicio','responsables','timestamp_servidor']);
    assert.deepEqual(Object.keys(op.datos.centroa).sort(),['cabana','noche','novedades','tarde']);
    const diario=env.documentos.get(op.ruta);assert.equal(diario.centroa.eventos[0].id,'legacy');assert.equal(diario.centroa.extra,'No tocar');assert.equal(diario.centroa.noche,'Nueva noche');assert.deepEqual(diario.responsables,['Nuevo responsable']);
    await env.contexto.guardarEnBD('2026-10-06',env.contexto.datosActuales);
    assert.equal('eventos' in env.documentos.get('reportes_unificados/RU_2026-10-06').centroa,false);
});

test('Oculto persiste sólo en histórico y la UI se actualiza después del éxito', async () => {
    const env=entorno({diarios:{'2026-10-05':reporte([evento()])},historicos:{incidencia:evento()}});await env.cargar();
    const diario=clone(env.documentos.get('reportes_unificados/RU_2026-10-05'));
    const btn=env.element('ocultar');btn.classList.add('btn-outline-secondary');btn.icon.classList.add('bi-eye');
    await env.contexto.toggleVisibilidadCuracion(btn,'incidencia','centroa');
    assert.equal(env.escrituras.length,1);assert.equal(env.escrituras[0].tipo,'update');assert.equal(env.escrituras[0].datos.oculto,true);
    assert.deepEqual(env.documentos.get('reportes_unificados/RU_2026-10-05'),diario);
    assert.equal(env.contexto.datosActuales.centroa.eventos[0].oculto,true);assert.ok(env.element('evt-incidencia').classList.contains('oculto-exportacion'));
    await env.contexto.toggleVisibilidadCuracion(btn,'incidencia','centroa');assert.equal(env.documentos.get('eventos_historicos/incidencia').oculto,false);
});

test('Error al ocultar conserva estado, tarjeta e icono', async () => {
    const env=entorno({historicos:{incidencia:evento()},fallo:'update'});await env.cargar();const btn=env.element('ocultar');btn.icon.classList.add('bi-eye');
    await env.contexto.toggleVisibilidadCuracion(btn,'incidencia','centroa');
    assert.equal(env.contexto.datosActuales.centroa.eventos[0].oculto,false);assert.equal(env.element('evt-incidencia').classList.contains('oculto-exportacion'),false);assert.equal(btn.disabled,false);
});

test('Una edición de un evento ya eliminado no lo recrea', async () => {
    const env=entorno({historicos:{incidencia:evento()}});await env.cargar();env.documentos.delete('eventos_historicos/incidencia');
    await env.guardarIncidencia(evento({comentario:'Desactualizado'}));assert.equal(env.documentos.has('eventos_historicos/incidencia'),false);assert.equal(env.escrituras.length,0);assert.equal(env.modal.hidden,false);
});

test('Errores de guardado/carga no cambian memoria ni recurren a arrays legacy', async () => {
    const env=entorno({historicos:{incidencia:evento()},fallo:'update'});await env.cargar();const anterior=clone(env.contexto.datosActuales);
    await env.guardarIncidencia(evento({comentario:'Error'}));assert.deepEqual(clone(env.contexto.datosActuales),anterior);assert.equal(env.modal.hidden,false);
    const fallaCarga=entorno({diarios:{'2026-10-05':reporte([evento()])},fallo:'query'});await fallaCarga.cargar();assert.deepEqual(fallaCarga.ids(),[]);assert.equal(fallaCarga.alerts.length,1);
});

test('Excel Diario usa las incidencias canónicas en memoria y excluye oculto === true', async () => {
    const env=entorno({diarios:{'2026-10-05':reporte([evento({id:'legacy'})])},historicos:{visible:evento({id:'visible',comentario:'Sólo canónico'}),oculta:evento({id:'oculta',oculto:true})}});await env.cargar();await env.contexto.descargarExcelEventos();
    const rows=env.libros[0].sheets[0].rows;assert.equal(rows.length,4);assert.equal(rows[3].values[6],'Sólo canónico');assert.equal(env.descargas.length,1);
});

test('Auditoría no se ejecuta sola, sólo lee, compara IDs únicos y lista cada aparición sólo legacy', async () => {
    const env=entorno({historicos:{comun1:evento({id:'comun1'}),comun2:evento({id:'comun2'}),soloHist:evento({id:'soloHist'})},diarios:{'2026-09-30':reporte([evento({id:'comun1'}),evento({id:'soloLegacy'})]),'2026-10-05':{centroa:centro([evento({id:'comun2'})]),centrob:centro([evento({id:'soloLegacy'})])}}});
    const antes=clone([...env.documentos]);vm.runInContext(fs.readFileSync(path.join(__dirname,'../scripts/auditar-incidencias.js'),'utf8'),env.contexto);assert.equal(env.trace.length,0);
    const resultado=await env.contexto.auditarConsistenciaIncidencias();
    assert.equal(resultado.resumen.eventosHistoricos,3);assert.equal(resultado.resumen.idsEncontradosEnReportesLegacy,3);assert.equal(resultado.resumen.coincidentes,2);assert.equal(resultado.resumen.soloHistoricos,1);assert.equal(resultado.resumen.soloLegacy,1);
    assert.deepEqual(Array.from(resultado.idsSoloLegacy),['soloLegacy']);assert.equal(resultado.soloLegacy.length,2);assert.equal(resultado.soloLegacy[1].centro,'centrob');
    assert.equal(resultado.resumen.historicosConMetadataIncompleta,0);assert.equal(env.escrituras.length,0);assert.deepEqual([...env.documentos],antes);
});

test('Auditoría detecta fechas/metadata incompletas y IDs legacy ausentes, sin repararlos', async () => {
    const env=entorno({historicos:{mal:evento({id:'otro',fechaHora:'inválida',id_centro:undefined,nombre_centro:undefined,fecha_reporte:undefined})},diarios:{'2026-10-05':reporte([{comentario:'Sin ID'}])}});
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../scripts/auditar-incidencias.js'),'utf8'),env.contexto);
    const resultado=await env.contexto.auditarConsistenciaIncidencias();assert.equal(resultado.metadataIncompleta.length,1);assert.equal(resultado.legacySinId.length,1);assert.equal(resultado.fechasSinLimiteString.length,1);assert.equal(env.escrituras.length,0);
});

test('Creación y edición no modifican memoria ni tarjeta antes de confirmarse la escritura', async () => {
    for(const existente of [false,true]) {
        let env,liberar,listo;
        const pendiente=new Promise(resolve=>{listo=resolve;});
        env=entorno({historicos:existente?{incidencia:evento()}: {},antesEscritura:async()=>{
            assert.deepEqual(env.ids(),existente?['incidencia']:[]);
            if(existente)assert.equal(env.contexto.datosActuales.centroa.eventos[0].comentario,'Detalle');
            assert.equal(env.element('evt-incidencia').innerHTML,'');
            listo();await new Promise(resolve=>{liberar=resolve;});
        }});
        await env.cargar();const guardado=env.guardarIncidencia(evento({comentario:'Confirmado'}));await pendiente;liberar();await guardado;
        assert.equal(env.contexto.datosActuales.centroa.eventos[0].comentario,'Confirmado');assert.equal(env.escrituras.length,1);
    }
});

test('Error de creación no añade la incidencia ni muestra confirmación exitosa', async () => {
    const env=entorno({fallo:'set'});await env.cargar();await env.guardarIncidencia(evento());
    assert.deepEqual(env.ids(),[]);assert.equal(env.documentos.has('eventos_historicos/incidencia'),false);assert.equal(env.modal.hidden,false);assert.equal(env.element('btn-confirmar-sync').disabled,false);
});

test('Ventanas locales conservan días y horas al cambiar año y atravesar horario de verano', () => {
    const env=entorno();
    for(const [fecha,anio,mes,dia] of [['2026-01-01',2025,11,31],['2026-09-06',2026,8,5]]) {
        const periodo=vm.runInContext(`obtenerPeriodoReporte('${fecha}','07:30','07:30')`,env.contexto);
        assert.equal(periodo.inicio.getFullYear(),anio);assert.equal(periodo.inicio.getMonth(),mes);assert.equal(periodo.inicio.getDate(),dia);
        assert.equal(periodo.inicio.getHours(),7);assert.equal(periodo.inicio.getMinutes(),30);assert.equal(periodo.fin.getHours(),7);assert.equal(periodo.fin.getMinutes(),30);
    }
});
