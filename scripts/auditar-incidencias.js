/* Auditoría de desarrollo, sólo lectura. No se carga ni se ejecuta automáticamente.
   En la consola de la aplicación autenticada:
   const script = document.createElement('script');
   script.src = 'scripts/auditar-incidencias.js';
   script.onload = async () => console.log(await window.auditarConsistenciaIncidencias());
   document.head.appendChild(script);
*/
(function () {
    'use strict';
    window.auditarConsistenciaIncidencias = async function () {
        const [historicos, diarios] = await Promise.all([
            db.collection('eventos_historicos').get({ source: 'server' }),
            db.collection('reportes_unificados').get({ source: 'server' })
        ]);
        const idsHistoricos = new Set();
        const idsLegacy = new Set();
        const aparicionesLegacy = [];
        const metadataIncompleta = [];
        const fechasSinLimiteString = [];
        const legacySinId = [];
        const centros = new Set((window.opcionesGlobales.centros || []).map(nombre => nombre.replace(/\s+/g, '').toLowerCase()));
        function fechaValida(valor) {
            if (!valor) return false;
            const fecha = typeof valor.toDate === 'function' ? valor.toDate() : new Date(valor);
            if (!Number.isFinite(fecha.getTime())) return false;
            if (typeof valor !== 'string') return typeof valor.toDate === 'function' || valor instanceof Date;
            const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
            return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[3]) >= 1 && Number(m[3]) <= new Date(Number(m[1]), Number(m[2]), 0).getDate() && Number(m[4]) <= 23 && Number(m[5]) <= 59;
        }
        historicos.forEach(doc => {
            idsHistoricos.add(doc.id);
            const evt = doc.data();
            const problemas = [];
            if (evt.id !== doc.id) problemas.push('id ausente o distinto del ID de documento');
            if (!fechaValida(evt.fechaHora)) problemas.push('fechaHora ausente o inválida');
            if (evt.fechaHoraFin && !fechaValida(evt.fechaHoraFin)) problemas.push('fechaHoraFin inválida');
            if (!evt.id_centro) problemas.push('id_centro ausente');
            const centroPorNombre = typeof evt.nombre_centro === 'string' ? evt.nombre_centro.replace(/\s+/g, '').toLowerCase() : '';
            if (!centros.has(evt.id_centro) && !centros.has(centroPorNombre)) problemas.push('centro no configurado/no resoluble');
            if (!evt.nombre_centro) problemas.push('nombre_centro ausente');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(evt.fecha_reporte || '')) problemas.push('fecha_reporte ausente o inválida');
            if (typeof evt.fechaHora !== 'string' || !fechaValida(evt.fechaHora)) fechasSinLimiteString.push(doc.id);
            if (problemas.length) metadataIncompleta.push({ rowId: doc.id, problemas });
        });
        diarios.forEach(doc => {
            // Ésta es la única lectura deliberada de arrays legacy: auditoría, nunca carga del reporte.
            Object.entries(doc.data()).forEach(([centro, datos]) => {
                if (!Array.isArray(datos?.eventos)) return;
                datos.eventos.forEach(evt => {
                    if (!evt || typeof evt.id !== 'string' || !evt.id) {
                        legacySinId.push({ fechaReporte: doc.id.replace(/^RU_/, ''), centro });
                        return;
                    }
                    idsLegacy.add(evt.id);
                    aparicionesLegacy.push({ rowId: evt.id, fechaReporte: doc.id.replace(/^RU_/, ''), centro });
                });
            });
        });
        const coincidentes = [...idsHistoricos].filter(id => idsLegacy.has(id));
        const soloHistoricos = [...idsHistoricos].filter(id => !idsLegacy.has(id)).sort();
        const idsSoloLegacy = [...idsLegacy].filter(id => !idsHistoricos.has(id)).sort();
        const soloLegacy = aparicionesLegacy.filter(evt => !idsHistoricos.has(evt.rowId));
        const resumen = {
            eventosHistoricos: historicos.size,
            idsEncontradosEnReportesLegacy: idsLegacy.size,
            coincidentes: coincidentes.length,
            soloHistoricos: soloHistoricos.length,
            soloLegacy: idsSoloLegacy.length,
            historicosConMetadataIncompleta: metadataIncompleta.length,
            fechasNoCompatiblesConLimiteString: fechasSinLimiteString.length
        };
        console.info('[AuditoriaIncidencias] Eventos históricos:', resumen.eventosHistoricos);
        console.info('[AuditoriaIncidencias] IDs encontrados en reportes legacy:', resumen.idsEncontradosEnReportesLegacy);
        console.info('[AuditoriaIncidencias] Coincidentes:', resumen.coincidentes);
        console.info('[AuditoriaIncidencias] Sólo históricos:', resumen.soloHistoricos);
        console.info('[AuditoriaIncidencias] Sólo legacy:', resumen.soloLegacy);
        if (soloLegacy.length) console.table(soloLegacy);
        if (metadataIncompleta.length) console.warn('[AuditoriaIncidencias] Metadata incompleta:', metadataIncompleta);
        if (legacySinId.length) console.warn('[AuditoriaIncidencias] Representaciones legacy sin ID:', legacySinId);
        return { resumen, soloHistoricos, idsSoloLegacy, soloLegacy, metadataIncompleta, fechasSinLimiteString, legacySinId };
    };
}());
