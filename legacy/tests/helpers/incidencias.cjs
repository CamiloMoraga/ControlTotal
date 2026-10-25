const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
process.env.TZ = 'America/Santiago';
const codigo = fs.readFileSync(path.join(__dirname, '../../assets/js/legacy.js'), 'utf8');
const clone = valor => structuredClone(valor);
const evento = extra => ({ id: 'incidencia', fechaHora: '2026-09-30T10:00', fechaHoraFin: '', persona: 'Ana | Luis', comentario: 'Detalle', ocurrencias: '1', motivo: 'Sensor', submotivo: 'Calibración', tipo: 'Falla', categoria: 'Sensor', parametro: 'Oxígeno [mg/L]', condicion: 'Bajo', valor: '0.5', area: 'Smolt', estanques: 'E1', oculto: false, timestamp_edicion: 1, id_centro: 'centroa', nombre_centro: 'Centro A', fecha_reporte: '2026-10-01', ...extra });
const centro = eventos => ({ cabana: 'Permanencia', tarde: 'Tarde', noche: 'Noche', novedades: 'Novedades', extra: 'No tocar', eventos });
const reporte = eventos => ({ responsables: ['Responsable'], horaInicio: '07:30', horaFin: '07:30', centroa: centro(eventos) });
class ClassList {
    constructor(){ this.set = new Set(); }
    add(v){this.set.add(v);} remove(v){this.set.delete(v);} contains(v){return this.set.has(v);}
    toggle(v, force){const activo = force ?? !this.contains(v); activo ? this.add(v) : this.remove(v); return activo;}
    replace(a, b){if(this.contains(a)){this.remove(a);this.add(b);}}
}
function entorno({ diarios = {}, historicos = {}, fecha = '2026-10-05', fallo, antesEscritura } = {}) {
    const documentos = new Map();
    Object.entries(diarios).forEach(([dia, datos]) => documentos.set('reportes_unificados/RU_' + dia, clone(datos)));
    Object.entries(historicos).forEach(([id, datos]) => documentos.set('eventos_historicos/' + id, clone(datos)));
    const trace = [], escrituras = [], alerts = [], logs = [], elements = new Map(), personal = new Map(), libros = [], descargas = [];
    let renders = 0;
    function element(id) {
        if (!elements.has(id)) elements.set(id, { id, value: '', innerHTML: '', innerText: '', disabled: false, removed: false, style: {}, classList: new ClassList(), icon: { classList: new ClassList() }, querySelector() { return this.icon; }, remove() { this.removed = true; } });
        return elements.get(id);
    }
    element('ru-fecha').value = fecha;
    element('ru-hora-inicio').value = element('ru-hora-fin').value = '07:30';
    const snap = ruta => ({ id: ruta.split('/')[1], exists: documentos.has(ruta), ref: ref(ruta), data: () => clone(documentos.get(ruta)) });
    function merge(actual, parche) {
        const salida = clone(actual || {});
        Object.entries(parche).forEach(([key, valor]) => { salida[key] = valor && typeof valor === 'object' && !Array.isArray(valor) && !(valor instanceof Date) ? merge(salida[key], valor) : clone(valor); });
        return salida;
    }
    async function escribir(tipo, ruta, datos, opciones) {
        trace.push([tipo, ruta]);
        if (antesEscritura) await antesEscritura(tipo, ruta);
        if (fallo === tipo || fallo === 'write') throw new Error('Escritura rechazada');
        if (tipo === 'update' && !documentos.has(ruta)) throw new Error('Documento inexistente');
        escrituras.push({ tipo, ruta, datos: clone(datos), opciones });
        if (tipo === 'delete') documentos.delete(ruta);
        else documentos.set(ruta, tipo === 'update' || opciones?.merge ? merge(documentos.get(ruta), datos) : clone(datos));
    }
    function ref(ruta) { return {
        path: ruta, async get(opciones) { trace.push(['get', ruta, opciones]); if (fallo === 'read') throw new Error('Lectura rechazada'); return snap(ruta); },
        set: (datos, opciones) => escribir('set', ruta, datos, opciones), update: datos => escribir('update', ruta, datos), delete: () => escribir('delete', ruta)
    }; }
    const db = {
        collection(nombre) {
            const clausulas = [];
            return {
                doc(id) { return ref(nombre + '/' + id); },
                where(campo, op, limite) { clausulas.push([campo, op, limite]); return this; },
                async get(opciones) {
                    trace.push(['query', nombre, clone(clausulas), opciones]);
                    if (fallo === 'query') throw new Error('Consulta rechazada');
                    const docs = [...documentos.keys()].filter(ruta => ruta.startsWith(nombre + '/') && clausulas.every(([campo, op, limite]) => {
                        const valor = campo === '__name__' ? ruta.split('/')[1] : documentos.get(ruta)[campo];
                        return valor != null && (op === '<=' ? valor <= limite : op === '>=' ? valor >= limite : valor === limite);
                    })).sort().map(snap);
                    return { docs, size: docs.length, empty: !docs.length, forEach(fn) { docs.forEach(fn); } };
                }
            };
        },
        batch() {
            const ops = [];
            return { set(referencia, datos, opciones) { ops.push({ referencia, datos, opciones }); }, async commit() {
                if (fallo === 'commit') throw new Error('Commit rechazado');
                for (const op of ops) await escribir('set', op.referencia.path, op.datos, op.opciones);
            } };
        }
    };
    const firestore = () => db;
    firestore.FieldPath = { documentId: () => '__name__' };
    firestore.FieldValue = { serverTimestamp: () => ({ timestampServidor: true }) };
    const modal = { hidden: false, shown: false, show() { this.shown = true; this.hidden = false; }, hide() { this.hidden = true; } };
    function Modal(){return modal;} Modal.getInstance = () => modal;
    Modal.getOrCreateInstance = () => modal;
    class Row { constructor(values){this.values = values;this.cells=values.map(value=>({value}));} eachCell(fn){this.cells.forEach(fn);} }
    class Workbook { constructor(){this.sheets=[];libros.push(this);this.xlsx={writeBuffer:async()=>new Uint8Array([1,2])};} addWorksheet(nombre){const ws={nombre,rows:[],addRow(values){const row=new Row(values);this.rows.push(row);return row;},getRow(n){return this.rows[n-1];},eachRow(fn){this.rows.forEach((row,index)=>fn(row,index+1));}};this.sheets.push(ws);return ws;} }
    const contexto = vm.createContext({ firebase: { apps: [{}], firestore, auth: () => ({ onAuthStateChanged() {} }) }, document: { getElementById: element, querySelector: () => element('btn-guardar-reporte'), querySelectorAll: selector => personal.get(selector) || [] }, bootstrap: { Modal }, alert: texto => alerts.push(texto), setInterval() {}, setTimeout(fn) { fn(); }, console: Object.fromEntries(['info', 'warn', 'error', 'table'].map(nivel => [nivel, (...args) => logs.push([nivel, ...args])])), ExcelJS: { Workbook }, saveAs: (blob, nombre) => descargas.push({ blob, nombre }), Blob, __registrarRender() { renders++; } });
    contexto.window = contexto;
    vm.runInContext(codigo, contexto);
    vm.runInContext('renderizarUICompleta = function () { __registrarRender(); };', contexto);
    contexto.esSuperAdmin = true;
    contexto.opcionesGlobales = { centros: ['Centro A', 'Centro B'], numResponsables: 1, parametros: ['Oxígeno [mg/L]'], motivos: ['Sensor'], submotivos: {Sensor:['Calibración']}, areas: ['Smolt'], personal: [], categorias: ['Sensor'], firmantes: [], condiciones: ['Bajo'] };
    contexto.datosActuales = { responsables: ['Responsable'], horaInicio: '07:30', horaFin: '07:30', centroa: centro([]), centrob: centro([]) };
    async function cargar(dia = fecha) { element('ru-fecha').value = dia; await contexto.cargarReporteUnificado(); }
    async function guardarIncidencia(evt, cId = 'centroa') {
        const campos = {fec:'fechaHora',fec_fin:'fechaHoraFin',com:'comentario',ocu:'ocurrencias',mot:'motivo',sub:'submotivo',t:'tipo',cat:'categoria',par:'parametro',con:'condicion',val:'valor',are:'area',est:'estanques'};
        Object.entries(campos).forEach(([prefijo, campo]) => { element(prefijo+'_'+evt.id).value = evt[campo] ?? ''; });
        personal.set('.sel-per-' + evt.id, (evt.persona || '').split('|').map(value => ({ value: value.trim() })));
        contexto.prepararGuardadoEvento(evt.id, cId);
        await contexto.ejecutarSyncEvento();
    }
    async function eliminar(id='incidencia', cId='centroa') { contexto.prepararEliminacionEvento(id,cId); await contexto.ejecutarSyncEvento(); }
    const ids = () => Object.values(contexto.datosActuales).flatMap(c => Array.isArray(c?.eventos) ? c.eventos.map(evt => evt.id) : []);
    return { contexto, db, documentos, trace, escrituras, alerts, logs, element, modal, cargar, guardarIncidencia, eliminar, ids, libros, descargas, renders: () => renders };
}
module.exports = { entorno, evento, centro, reporte, clone, codigo, assert, vm };
