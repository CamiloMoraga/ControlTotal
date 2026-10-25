/* Dashboard Histórico: script clásico, aislado y exclusivamente de lectura. */
(function () {
    'use strict';

    const modal = document.getElementById('modalDashboard');
    const el = id => document.getElementById('dash-' + id);
    const filtros = { centro: 'nombre_centro', area: 'area', parametro: 'parametro', motivo: 'motivo', submotivo: 'submotivo' };
    const charts = new Map();
    const seleccionesAnteriores = new Map();
    const formato = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const formatearNumero = valor => formato.format(valor);
    const colores = ['#0096a0', '#efad42', '#005f66', '#79c6ca', '#677f93', '#ca7a62'];
    let datos = [];
    let filtrados = [];
    let rangoConsultado = '';
    let horaCalculo = new Date();
    let solicitud = 0;
    let cargando = false;

    function fechaLocal(fecha) {
        return [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, '0'), String(fecha.getDate()).padStart(2, '0')].join('-');
    }

    function fijarRango(valor) {
        const fin = new Date();
        const inicio = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
        if (valor === 'mes') inicio.setDate(1);
        else inicio.setDate(inicio.getDate() - (Number(valor) - 1));
        el('inicio').value = fechaLocal(inicio);
        el('fin').value = fechaLocal(fin);
    }

    function rangoActual() { return el('inicio').value + '/' + el('fin').value; }

    function mensaje(texto, error = false) {
        el('status').textContent = texto;
        el('status').classList.toggle('text-danger', error);
    }

    function destruirCharts() {
        charts.forEach(chart => chart.destroy());
        charts.clear();
    }

    function limpiarResultados() {
        destruirCharts();
        filtrados = [];
        rangoConsultado = '';
        el('excel').disabled = true;
        ['total', 'horas', 'abiertos', 'centros'].forEach(key => { el('kpi-' + key).textContent = '—'; });
        ranking('parametros', []);
        ranking('analisis', []);
        ['centros', 'motivos', 'tipos', 'analisis'].forEach(key => {
            el('wrap-' + key).classList.add('d-none');
            el('empty-' + key).classList.remove('d-none');
        });
    }

    function poblarFiltros() {
        const opciones = window.opcionesGlobales || {};
        const motivos = [...(opciones.motivos || []), ...Object.keys(opciones.submotivos || {})];
        const valores = {
            centro: opciones.centros || [], area: opciones.areas || [],
            parametro: (opciones.parametros || []).map(nombreParametro),
            motivo: motivos, submotivo: Object.values(opciones.submotivos || {}).flat()
        };
        Object.keys(filtros).forEach(key => {
            const seleccionados = new Set(Array.from(el(key).selectedOptions, option => option.value));
            const unicos = [...new Set(valores[key].filter(value => typeof value === 'string' && value.trim()))];
            el(key).replaceChildren(new Option('Todos', ''));
            unicos.sort((a, b) => a.localeCompare(b, 'es')).forEach(value => el(key).add(new Option(value, value)));
            Array.from(el(key).options).forEach(option => { option.selected = seleccionados.has(option.value); });
            if (!el(key).selectedOptions.length) el(key).options[0].selected = true;
            seleccionesAnteriores.set(key, Array.from(el(key).selectedOptions, option => option.value));
        });
    }

    function fechaEvento(valor) {
        if (!valor) return null;
        const fecha = typeof valor.toDate === 'function' ? valor.toDate() : new Date(valor);
        return Number.isFinite(fecha.getTime()) ? fecha : null;
    }

    function duracion(evt) {
        const inicio = fechaEvento(evt.fechaHora);
        const fin = evt.fechaHoraFin ? fechaEvento(evt.fechaHoraFin) : horaCalculo;
        return inicio && fin ? Math.max(0, (fin - inicio) / 3600000) : 0;
    }

    function ocurrencias(evt) {
        const valor = evt.ocurrencias;
        if (valor == null || (typeof valor === 'string' && !valor.trim())) return 1;
        const numero = (typeof valor === 'number' || typeof valor === 'string') ? Number(valor) : NaN;
        return Number.isFinite(numero) ? numero : 1;
    }

    function nombreParametro(valor) {
        return String(valor || '').replace(/\s*\[[^\]]*\]/g, '').trim();
    }

    function etiqueta(evt, campo) {
        const valor = String(evt[campo] || '').trim();
        if (campo === 'parametro') return nombreParametro(valor) || 'Sin parámetro';
        if (campo === 'tipo') {
            if (valor.toLowerCase() === 'falla') return 'Falla';
            if (valor.toLowerCase() === 'alarma') return 'Alarma';
        }
        return valor || 'Sin especificar';
    }

    function agrupar(campo, metrica = 'eventos') {
        const grupos = new Map();
        filtrados.forEach(evt => {
            const nombre = etiqueta(evt, campo);
            if (!grupos.has(nombre)) grupos.set(nombre, { nombre, eventos: 0, horas: 0 });
            const grupo = grupos.get(nombre);
            grupo.eventos += ocurrencias(evt);
            grupo.horas += duracion(evt);
        });
        return [...grupos.values()].sort((a, b) => b[metrica] - a[metrica] || a.nombre.localeCompare(b.nombre, 'es'));
    }

    function ranking(key, grupos) {
        const body = el('ranking-' + key);
        body.replaceChildren();
        if (!grupos.length) {
            const row = body.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 3;
            cell.className = 'text-muted';
            cell.textContent = 'Sin resultados.';
            return;
        }
        grupos.forEach(grupo => {
            const row = body.insertRow();
            [grupo.nombre, formatearNumero(grupo.eventos), formatearNumero(grupo.horas) + ' h'].forEach((valor, index) => {
                const cell = row.insertCell();
                cell.textContent = valor;
                if (index) cell.className = 'text-end';
            });
        });
    }

    function graficar(key, grupos, metrica, horizontal = false, doughnut = false) {
        if (charts.has(key)) { charts.get(key).destroy(); charts.delete(key); }
        const sinDatos = !grupos.length;
        el('wrap-' + key).classList.toggle('d-none', sinDatos);
        el('empty-' + key).classList.toggle('d-none', !sinDatos);
        if (sinDatos || !window.Chart) return;
        el('wrap-' + key).style.height = (horizontal ? Math.max(290, grupos.length * 32) : 290) + 'px';
        const unidad = metrica === 'horas' ? 'Horas acumuladas' : 'Eventos (ocurrencias)';
        const options = {
            responsive: true, maintainAspectRatio: false, locale: 'es-CL',
            plugins: {
                legend: { display: doughnut, position: 'bottom' },
                tooltip: { callbacks: { label: context => unidad + ': ' + formatearNumero(doughnut ? context.parsed : (horizontal ? context.parsed.x : context.parsed.y)) } }
            }
        };
        if (!doughnut) {
            options.indexAxis = horizontal ? 'y' : 'x';
            options.scales = {
                [horizontal ? 'x' : 'y']: { beginAtZero: true, title: { display: true, text: unidad }, ticks: { callback: valor => formatearNumero(valor) } },
                [horizontal ? 'y' : 'x']: { ticks: { autoSkip: false } }
            };
        }
        charts.set(key, new Chart(el('chart-' + key), {
            type: doughnut ? 'doughnut' : 'bar',
            data: {
                labels: grupos.map(grupo => grupo.nombre),
                datasets: [{ label: unidad, data: grupos.map(grupo => grupo[metrica]), backgroundColor: grupos.map((_, index) => colores[index % colores.length]), borderRadius: doughnut ? 0 : 4 }]
            }, options
        }));
    }

    function analizar() {
        const campo = el('agrupar').value;
        const metrica = el('metrica').value;
        const grupos = agrupar(campo, metrica);
        el('ranking-label').textContent = el('agrupar').selectedOptions[0].textContent;
        graficar('analisis', grupos, metrica, true);
        ranking('analisis', grupos);
    }

    function aplicarFiltros() {
        if (cargando || rangoConsultado !== rangoActual()) return;
        const selecciones = Object.keys(filtros).map(key => ({
            campo: filtros[key], valores: Array.from(el(key).selectedOptions, option => option.value)
        }));
        filtrados = datos.filter(evt => selecciones.every(({ campo, valores }) =>
            !valores.length || valores.includes('') || valores.includes(campo === 'parametro' ? nombreParametro(evt[campo]) : evt[campo])
        ));
        el('kpi-total').textContent = formatearNumero(filtrados.length) + ' eventos';
        el('kpi-horas').textContent = formatearNumero(filtrados.reduce((total, evt) => total + duracion(evt), 0)) + ' h';
        el('kpi-abiertos').textContent = formatearNumero(filtrados.filter(evt => !evt.fechaHoraFin).length) + ' en curso';
        const centros = new Set(filtrados.map(evt => evt.nombre_centro || evt.id_centro).filter(Boolean));
        el('kpi-centros').textContent = formatearNumero(centros.size) + ' centros';
        graficar('centros', agrupar('nombre_centro'), 'eventos');
        graficar('motivos', agrupar('motivo', 'horas'), 'horas', true);
        graficar('tipos', agrupar('tipo'), 'eventos', false, true);
        ranking('parametros', agrupar('parametro'));
        analizar();
        el('excel').disabled = !filtrados.length;
        const estado = filtrados.length ? formatearNumero(filtrados.length) + ' eventos encontrados.' : 'Sin resultados para los filtros seleccionados.';
        mensaje(estado + ' Rango: ' + el('inicio').value + ' al ' + el('fin').value + '. Duraciones calculadas a las ' + horaCalculo.toLocaleTimeString('es-CL') +
            (window.Chart ? '' : ' Chart.js no está disponible; puede consultar los indicadores, rankings y Excel.'), !window.Chart);
    }

    async function consultar() {
        const inicio = el('inicio').value;
        const fin = el('fin').value;
        const turno = ++solicitud;
        limpiarResultados();
        datos = [];
        if (!inicio || !fin || inicio > fin) {
            cargando = false;
            el('consultar').disabled = false;
            modal.removeAttribute('aria-busy');
            mensaje('Indique un rango válido: Inicio debe ser anterior o igual a Fin.', true);
            return;
        }
        cargando = true;
        el('consultar').disabled = true;
        modal.setAttribute('aria-busy', 'true');
        mensaje('Consultando eventos históricos…');
        try {
            const snapshot = await db.collection('eventos_historicos')
                .where('fecha_reporte', '>=', inicio)
                .where('fecha_reporte', '<=', fin)
                .get();
            if (turno !== solicitud) return;
            snapshot.forEach(doc => {
                const evt = doc.data();
                if (evt.oculto !== true) datos.push(evt);
            });
            horaCalculo = new Date();
            rangoConsultado = inicio + '/' + fin;
            cargando = false;
            aplicarFiltros();
        } catch (error) {
            if (turno !== solicitud) return;
            limpiarResultados();
            mensaje('No se pudo consultar el histórico. Revise la conexión y los permisos de lectura, e intente nuevamente.', true);
            console.error('Dashboard Histórico:', error);
        } finally {
            if (turno === solicitud) {
                cargando = false;
                el('consultar').disabled = false;
                modal.removeAttribute('aria-busy');
            }
        }
    }

    function textoFecha(valor) {
        if (!valor) return '';
        if (typeof valor === 'string') return valor.replace('T', ' ');
        const fecha = fechaEvento(valor);
        return fecha ? fecha.toLocaleString('es-CL') : '';
    }

    async function descargarExcel() {
        if (cargando || rangoConsultado !== rangoActual() || !filtrados.length) return;
        if (!window.ExcelJS || !window.saveAs) {
            mensaje('ExcelJS o FileSaver no están disponibles. Recargue la página e intente nuevamente.', true);
            return;
        }
        // Capturar el resultado actual antes de la escritura asíncrona del archivo.
        const eventos = filtrados.slice();
        const rango = rangoConsultado;
        el('excel').disabled = true;
        try {
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Histórico Fallas y Alarmas');
            const cabecera = ['DÍA REPORTE', 'CENTRO', 'FECHA/HORA INICIO', 'FECHA/HORA FIN', 'HRS DURACIÓN', 'PERSONAL', 'MOTIVO', 'SUB-MOTIVO', 'COMENTARIOS', 'TIPO', 'EQUIPO', 'PARÁMETRO', 'CONDICIÓN', 'VALOR', 'ÁREA', 'ESTANQUES'];
            ws.addRow(cabecera);
            ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0096A0' } };
            eventos.forEach(evt => {
                const row = ws.addRow([
                    evt.fecha_reporte || '', evt.nombre_centro || '', textoFecha(evt.fechaHora),
                    evt.fechaHoraFin ? textoFecha(evt.fechaHoraFin) : 'EN CURSO',
                    Math.round(duracion(evt) * 100) / 100, String(evt.persona || '').replace(/\|/g, ', '),
                    evt.motivo || '', evt.submotivo || '', evt.comentario || '', evt.tipo || '',
                    evt.categoria || '', evt.parametro || '', evt.condicion || '', evt.valor ?? '', evt.area || '',
                    Array.isArray(evt.estanques) ? evt.estanques.join(', ') : (evt.estanques || '')
                ]);
                row.getCell(5).numFmt = '0.00';
            });
            ws.columns = cabecera.map((_, index) => ({ width: [15, 22, 23, 23, 16, 30, 25, 25, 45, 14, 22, 25, 18, 14, 22, 25][index] }));
            ws.views = [{ state: 'frozen', ySplit: 1 }];
            ws.autoFilter = { from: 'A1', to: 'P1' };
            ws.eachRow(row => row.eachCell(cell => { cell.alignment = { vertical: 'middle', wrapText: true }; }));
            const buffer = await wb.xlsx.writeBuffer();
            saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Historico_Fallas_Alarmas_' + rango.replace('/', '_') + '.xlsx');
        } catch (error) {
            mensaje('No se pudo generar el Excel histórico. Intente nuevamente.', true);
            console.error('Excel histórico:', error);
        } finally {
            el('excel').disabled = cargando || rangoConsultado !== rangoActual() || !filtrados.length;
        }
    }

    window.abrirDashboard = function () {
        poblarFiltros();
        if (!el('inicio').value || !el('fin').value) fijarRango('7');
        bootstrap.Modal.getOrCreateInstance(modal).show();
    };

    modal.addEventListener('shown.bs.modal', consultar);
    modal.addEventListener('hidden.bs.modal', () => {
        ++solicitud;
        cargando = false;
        datos = [];
        limpiarResultados();
        modal.removeAttribute('aria-busy');
        el('consultar').disabled = false;
    });
    el('form').addEventListener('submit', evento => { evento.preventDefault(); consultar(); });
    modal.querySelectorAll('[data-dash-range]').forEach(boton => {
        boton.addEventListener('click', () => { fijarRango(boton.dataset.dashRange); consultar(); });
    });
    ['inicio', 'fin'].forEach(key => el(key).addEventListener('change', () => {
        ++solicitud;
        cargando = false;
        datos = [];
        limpiarResultados();
        el('consultar').disabled = false;
        modal.removeAttribute('aria-busy');
        mensaje('Rango modificado. Pulse «Consultar histórico» para actualizar los resultados.');
    }));
    Object.keys(filtros).forEach(key => {
        // «Todos» es exclusivo. Seleccionar valores concretos lo desactiva y viceversa.
        el(key).addEventListener('change', () => {
            const anterior = seleccionesAnteriores.get(key) || [''];
            const seleccion = Array.from(el(key).selectedOptions, option => option.value);
            if (seleccion.includes('') && seleccion.length > 1) {
                const todosNuevo = !anterior.includes('');
                Array.from(el(key).options).forEach(option => {
                    option.selected = todosNuevo ? option.value === '' : option.value !== '' && seleccion.includes(option.value);
                });
            }
            if (!el(key).selectedOptions.length) el(key).options[0].selected = true;
            seleccionesAnteriores.set(key, Array.from(el(key).selectedOptions, option => option.value));
            aplicarFiltros();
        });
    });
    ['agrupar', 'metrica'].forEach(key => el(key).addEventListener('change', () => {
        if (!cargando && rangoConsultado === rangoActual()) analizar();
    }));
    el('excel').addEventListener('click', descargarExcel);
    // Limpiar datos y cerrar el modal cuando termina la sesión existente.
    firebase.auth().onAuthStateChanged(user => {
        if (user) return;
        ++solicitud;
        datos = [];
        cargando = false;
        limpiarResultados();
        bootstrap.Modal.getInstance(modal)?.hide();
    });
}());
