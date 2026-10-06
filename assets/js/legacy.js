
    // LEGACY REFERENCE ONLY
    // Firebase fue retirado de Control Total v2.
    // Las credenciales originales fueron eliminadas deliberadamente.
    // Este archivo se conserva únicamente como referencia funcional.
    const firebaseConfig = {
        apiKey: "<REMOVED>",
        authDomain: "<REMOVED>",
        projectId: "<REMOVED>",
        storageBucket: "<REMOVED>",
        messagingSenderId: "<REMOVED>",
        appId: "<REMOVED>"
    };

    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    const db = firebase.firestore();
    const auth = firebase.auth();

    window.iniciarSesion = async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        const btn = document.getElementById('btn-login');
        const errDiv = document.getElementById('login-error');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Verificando...'; btn.disabled = true; errDiv.classList.add('d-none');
        try { await auth.signInWithEmailAndPassword(email, pass); } catch (error) { errDiv.innerText = "Credenciales incorrectas."; errDiv.classList.remove('d-none'); btn.innerHTML = 'Ingresar al Sistema'; btn.disabled = false; }
    }
    window.cerrarSesion = function() { auth.signOut(); }

    let esPrimeraCarga = true; 
    window.esSuperAdmin = false;

    auth.onAuthStateChanged(async (user) => {
        const loginUI = document.getElementById('login-container');
        const mainUI = document.getElementById('main-app-container');

        if (user && user.email) {
            loginUI.classList.remove('d-flex'); loginUI.classList.add('d-none');
            mainUI.classList.remove('d-none'); document.body.classList.remove('login-active');
            document.getElementById('lbl-usuario-actual').innerText = user.email;

            let esAdminUI = false;
            window.esSuperAdmin = false;
            try {
                const docPermisos = await db.collection('configuracion').doc('permisos').get();
                if (docPermisos.exists) {
                    const data = docPermisos.data();
                    const sAdmins = data.s_admin || [];
                    if (Array.isArray(sAdmins) && sAdmins.some(e => e.toLowerCase() === user.email.toLowerCase())) { esAdminUI = true; window.esSuperAdmin = true; }
                }
            } catch (error) { console.warn("No se pudo validar permisos en Firestore:", error); }

            if (esAdminUI) document.getElementById('btn-opciones').classList.remove('d-none');
            else document.getElementById('btn-opciones').classList.add('d-none');

            if (esPrimeraCarga) {
                await window.cargarOpcionesGlobalesBD();
                document.getElementById('ru-fecha').value = calcularFechaReporteOperacional(new Date(), document.getElementById('ru-hora-fin').value || '07:30');
                window.sincronizarRango();
                window.cargarReporteUnificado();
                esPrimeraCarga = false;
            }

        } else {
            loginUI.classList.add('d-flex'); loginUI.classList.remove('d-none');
            mainUI.classList.add('d-none'); document.body.classList.add('login-active');
            esPrimeraCarga = true; 
        }
    });

    window.opcionesGlobales = { numResponsables: 3, centros: ['Santa Juana'], categorias: ['Sensores'], parametros: ['pH'], condiciones: ['Alto'], areas: ['Hatchery'], personal: [], firmantes: [], motivos: [], submotivos: {} };
    window.datosActuales = {};
    window.accionPendienteSync = null;

    window.cargarOpcionesGlobalesBD = async function() { 
        try { 
            const docSnap = await db.collection('menus').doc('opciones_unificadas').get(); 
            if (docSnap.exists) { window.opcionesGlobales = { ...window.opcionesGlobales, ...docSnap.data() }; } 
        } catch (error) {} 
    }

    window.obtenerDesdeBD = async function(fechaConsulta) { try { const docSnap = await db.collection('reportes_unificados').doc('RU_' + fechaConsulta).get(); if (docSnap.exists) return docSnap.data(); return null; } catch (error) { return null; } }

    // Los arrays de incidencias sólo existen en memoria; el payload diario es una lista explícita de campos.
    function construirPayloadReporteDiario(datos) {
        const payload = { responsables: datos.responsables || [], horaInicio: datos.horaInicio || '07:30', horaFin: datos.horaFin || '07:30' };
        window.opcionesGlobales.centros.forEach(nombre => {
            const cId = nombre.replace(/\s+/g, '').toLowerCase();
            const centro = datos[cId] || {};
            payload[cId] = { cabana: centro.cabana || '', tarde: centro.tarde || '', noche: centro.noche || '', novedades: centro.novedades || '' };
        });
        return payload;
    }

    // Fechas operacionales locales. ru-fecha es la fecha de cierre; todos los intervalos son [inicio, fin).
    function formatearFechaLocal(fecha) {
        const pad = numero => String(numero).padStart(2, '0');
        return `${String(fecha.getFullYear()).padStart(4, '0')}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
    }

    function sumarDiasLocal(fecha, dias) {
        const resultado = new Date(fecha.getTime());
        resultado.setDate(resultado.getDate() + dias);
        return resultado;
    }

    function parseFechaLocal(valor) {
        const m = typeof valor === 'string' && valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return fecha.getFullYear() === Number(m[1]) && fecha.getMonth() === Number(m[2]) - 1 && fecha.getDate() === Number(m[3]) ? fecha : null;
    }

    function parseHoraLocal(valor) {
        const m = typeof valor === 'string' && valor.match(/^(\d{2}):(\d{2})$/);
        return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? { hora: Number(m[1]), minuto: Number(m[2]) } : null;
    }

    function fechaIncidencia(valor) {
        if (!valor) return null;
        if (typeof valor.toDate === 'function') return fechaIncidencia(valor.toDate());
        if (Object.prototype.toString.call(valor) === '[object Date]') return Number.isFinite(valor.getTime()) ? new Date(valor.getTime()) : null;
        if (typeof valor !== 'string') return null;
        const m = valor.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/);
        if (!m) return null;
        const dia = parseFechaLocal(m[1]);
        const hora = parseHoraLocal(`${m[2]}:${m[3]}`);
        const segundo = Number(m[4] || 0);
        const milisegundo = Number((m[5] || '').padEnd(3, '0'));
        if (!dia || !hora || segundo > 59) return null;
        // Compatibilidad con instantes antiguos con offset: se interpretan como instantes y se presentan localmente.
        if (m[6]) {
            const instante = new Date(valor.replace(' ', 'T'));
            return Number.isFinite(instante.getTime()) ? instante : null;
        }
        const fecha = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hora.hora, hora.minuto, segundo, milisegundo);
        return fecha.getDate() === dia.getDate() && fecha.getHours() === hora.hora && fecha.getMinutes() === hora.minuto ? fecha : null;
    }

    function obtenerPeriodoReporte(fecha, horaInicio, horaFin) {
        const cierre = parseFechaLocal(fecha);
        const hi = parseHoraLocal(horaInicio);
        const hf = parseHoraLocal(horaFin);
        if (!cierre || !hi || !hf) throw new Error('Fecha u horas del reporte no válidas.');
        const anterior = sumarDiasLocal(cierre, -1);
        const inicio = fechaIncidencia(`${formatearFechaLocal(anterior)}T${horaInicio}`);
        const fin = fechaIncidencia(`${formatearFechaLocal(cierre)}T${horaFin}`);
        if (!inicio || !fin || fin <= inicio) throw new Error('Período del reporte no válido.');
        return { inicio, fin };
    }

    function calcularFechaReporteOperacional(fechaHora, horaCorte = '07:30') {
        const inicio = fechaIncidencia(fechaHora);
        const hora = parseHoraLocal(horaCorte);
        if (!inicio || !hora) throw new Error('Inicio de incidencia u hora de corte no válidos.');
        const corte = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), hora.hora, hora.minuto);
        return formatearFechaLocal(inicio < corte ? inicio : sumarDiasLocal(inicio, 1));
    }

    function validarIntervaloIncidencia(evt) {
        const inicio = fechaIncidencia(evt.fechaHora);
        const fin = evt.fechaHoraFin ? fechaIncidencia(evt.fechaHoraFin) : null;
        let mensaje = '';
        if (!inicio) mensaje = 'Indique una fecha y hora de inicio válida.';
        else if (evt.fechaHoraFin && !fin) mensaje = 'Indique una fecha y hora de término válida.';
        else if (fin && fin < inicio) mensaje = 'La fecha/hora de término no puede ser anterior al inicio.';
        else if (fin && fin.getTime() === inicio.getTime()) mensaje = 'El término debe ser posterior al inicio. No se admiten incidencias de duración cero.';
        if (mensaje) {
            const error = new Error(mensaje);
            error.validacionTemporal = true;
            throw error;
        }
        return { inicio, fin };
    }

    function incidenciaPerteneceAlPeriodo(evt, periodo) {
        const inicio = fechaIncidencia(evt.fechaHora);
        const fin = fechaIncidencia(evt.fechaHoraFin);
        if (inicio && fin && fin <= inicio) return false;
        // Límites desconocidos legacy siguen siendo conservadores; las fechas válidas usan intersección estricta.
        return (!inicio || inicio < periodo.fin) && (!fin || fin > periodo.inicio);
    }

    function formatearFechaHoraLocal(fecha, segundos = true) {
        const pad = numero => String(numero).padStart(2, '0');
        let texto = `${formatearFechaLocal(fecha)}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
        if (segundos && (fecha.getSeconds() || fecha.getMilliseconds())) {
            texto += `:${pad(fecha.getSeconds())}`;
            if (fecha.getMilliseconds()) texto += '.' + String(fecha.getMilliseconds()).padStart(3, '0');
        }
        return texto;
    }

    function fechaIncidenciaParaUI(valor) {
        if (!valor || typeof valor === 'string') return valor || '';
        const fecha = fechaIncidencia(valor);
        return fecha ? formatearFechaHoraLocal(fecha) : '';
    }

    async function cargarIncidenciasHistoricas(datos, periodo) {
        // Lectura completa hasta auditar los tipos de fechaHora existentes. Un where sobre strings omitiría registros antiguos sin ese campo o con Timestamp.
        const snapshot = await db.collection('eventos_historicos').get({ source: 'server' });
        const centros = new Map(window.opcionesGlobales.centros.map(nombre => [nombre.replace(/\s+/g, '').toLowerCase(), nombre]));
        const agrupados = new Map([...centros.keys()].map(cId => [cId, []]));
        snapshot.forEach(doc => {
            const evt = { ...doc.data(), id: doc.id };
            if (!fechaIncidencia(evt.fechaHora) || (evt.fechaHoraFin && !fechaIncidencia(evt.fechaHoraFin))) {
                console.warn('[Incidencias] Fecha incompleta o inválida; pertenencia temporal conservadora. ID:', doc.id);
            }
            const inicio = fechaIncidencia(evt.fechaHora);
            const fin = fechaIncidencia(evt.fechaHoraFin);
            if (inicio && fin && fin <= inicio) console.warn('[Incidencias] Duración no positiva; registro excluido. ID:', doc.id);
            if (!incidenciaPerteneceAlPeriodo(evt, periodo)) return;
            const nombreNormalizado = typeof evt.nombre_centro === 'string' ? evt.nombre_centro.replace(/\s+/g, '').toLowerCase() : '';
            const cId = centros.has(evt.id_centro) ? evt.id_centro : nombreNormalizado;
            if (!agrupados.has(cId)) {
                console.warn('[Incidencias] Centro ausente o no configurado; revisar auditoría. ID:', doc.id);
                return;
            }
            agrupados.get(cId).push({ ...evt, fechaHora: fechaIncidenciaParaUI(evt.fechaHora), fechaHoraFin: fechaIncidenciaParaUI(evt.fechaHoraFin) });
        });
        agrupados.forEach((eventos, cId) => { datos[cId].eventos = eventos; });
    }

    window.guardarEnBD = async function(fechaGuardado, datos) {
        try {
            const batch = db.batch();
            const payload = construirPayloadReporteDiario(datos);
            payload.timestamp_servidor = firebase.firestore.FieldValue.serverTimestamp();
            const docDiaRef = db.collection('reportes_unificados').doc('RU_' + fechaGuardado);
            batch.set(docDiaRef, payload, { merge: true });
            
            await batch.commit();
            return true;
        } catch (error) { 
            console.error("Error guardando en BD:", error);
            alert("Acceso Denegado o Error de Conexión. Revisa los permisos.");
            return false; 
        }
    }

    window.guardarReporteUnificado = async function() {
        const btn = document.querySelector('button[onclick="window.guardarReporteUnificado()"]');
        if (btn) { btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Guardando...'; btn.disabled = true; }
        
        const fecha = document.getElementById('ru-fecha').value;
        if (!fecha) { if(btn){ btn.innerHTML = '<i class="bi bi-floppy-fill"></i> Guardar BD'; btn.disabled = false; } return; }

        window.datosActuales.responsables = [];
        for(let i = 1; i <= (window.opcionesGlobales.numResponsables || 3); i++) {
            const sel = document.getElementById(`ru-resp-${i}`);
            if (sel) window.datosActuales.responsables.push(sel.value);
        }
        const periodoCambio = window.datosActuales.horaInicio !== document.getElementById('ru-hora-inicio').value || window.datosActuales.horaFin !== document.getElementById('ru-hora-fin').value;
        window.datosActuales.horaInicio = document.getElementById('ru-hora-inicio').value;
        window.datosActuales.horaFin = document.getElementById('ru-hora-fin').value;
        window.sincronizarRango();

        window.opcionesGlobales.centros.forEach(centro => {
            const cId = centro.replace(/\s+/g, '').toLowerCase();
            if (!window.datosActuales[cId]) window.datosActuales[cId] = { eventos: [] };
            const elCab = document.getElementById(`ru-${cId}-cabana`);
            const elTar = document.getElementById(`ru-${cId}-tarde`);
            const elNoc = document.getElementById(`ru-${cId}-noche`);
            const elNov = document.getElementById(`nov-${cId}`);
            
            if (elCab) window.datosActuales[cId].cabana = elCab.innerHTML;
            if (elTar) window.datosActuales[cId].tarde = elTar.innerHTML;
            if (elNoc) window.datosActuales[cId].noche = elNoc.innerHTML;
            if (elNov) window.datosActuales[cId].novedades = elNov.innerHTML;
        });
        
        const payload = construirPayloadReporteDiario(window.datosActuales);
        const guardado = await window.guardarEnBD(fecha, payload);
        if (!guardado) { if (btn) { btn.innerHTML = 'Guardar BD'; btn.disabled = false; } return; }
        if (periodoCambio) {
            try {
                await cargarIncidenciasHistoricas(window.datosActuales, obtenerPeriodoReporte(fecha, payload.horaInicio, payload.horaFin));
                renderizarUICompleta();
            } catch (error) {
                console.error('[Incidencias] No se pudo actualizar el período:', error);
                alert('Reporte guardado, pero no se pudieron recargar las incidencias del nuevo período. Sincronice cuando tenga conexión.');
            }
        }
        
        if (btn) { 
            btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> ¡Guardado Diario!'; btn.classList.add('btn-success');
            setTimeout(() => { btn.innerHTML = '<i class="bi bi-floppy-fill"></i> Guardar BD'; btn.classList.remove('btn-success'); btn.disabled = false; }, 2000);
        }
    }

    function mostrarConfirmacionIncidencia(mensaje) {
        const modal = document.getElementById('modalSyncEvento');
        if (!modal) {
            console.error('[Incidencias] Falta modalSyncEvento en la interfaz.');
            alert('No se puede abrir la confirmación de la incidencia. Recargue la aplicación.');
            return;
        }
        const msg = document.getElementById('msg-sync-evento');
        if (msg) msg.innerHTML = mensaje;
        else console.warn('[Incidencias] Falta el mensaje del modal: msg-sync-evento.');
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    window.prepararGuardadoEvento = function(rowId, cId) {
        const selectsPer = document.querySelectorAll(`.sel-per-${rowId}`);
        const valsPer = Array.from(selectsPer).map(s => s.value).filter(v => v !== '');
        const personasStr = valsPer.join(' | ');

        const objData = { 
            id: rowId, 
            fechaHora: document.getElementById(`fec_${rowId}`).value, 
            fechaHoraFin: document.getElementById(`fec_fin_${rowId}`).value, 
            persona: personasStr, 
            comentario: document.getElementById(`com_${rowId}`).value.trim(),
            ocurrencias: document.getElementById(`ocu_${rowId}`).value, 
            motivo: document.getElementById(`mot_${rowId}`).value, 
            submotivo: document.getElementById(`sub_${rowId}`).value, 
            tipo: document.getElementById(`t_${rowId}`).value, 
            categoria: document.getElementById(`cat_${rowId}`).value, 
            parametro: document.getElementById(`par_${rowId}`).value, 
            condicion: document.getElementById(`con_${rowId}`).value, 
            valor: document.getElementById(`val_${rowId}`).value, 
            area: document.getElementById(`are_${rowId}`).value, 
            estanques: document.getElementById(`est_${rowId}`).value,
            timestamp_edicion: Date.now() 
        };

        window.accionPendienteSync = { tipo: 'guardar', rowId: rowId, cId: cId, data: objData, horaCorte: document.getElementById('ru-hora-fin').value || '07:30' };
        
        mostrarConfirmacionIncidencia('Estás a punto de <strong class="text-corp">GUARDAR / ACTUALIZAR</strong> esta incidencia.');
    }

    window.prepararEliminacionEvento = function(rowId, cId) {
        if(!window.esSuperAdmin) return alert("Acceso Denegado: Solo el Super Admin puede eliminar registros permanentemente.");
        window.accionPendienteSync = { tipo: 'eliminar', rowId: rowId, cId: cId };
        mostrarConfirmacionIncidencia('Estás a punto de <strong class="text-danger">ELIMINAR PERMANENTEMENTE</strong> esta incidencia.');
    }

    window.ejecutarSyncEvento = async function() {
        const btn = document.getElementById('btn-confirmar-sync');
        const modal = document.getElementById('modalSyncEvento');
        if (!btn || !modal) {
            console.error('[Incidencias] Falta el modal o el botón de confirmación en la interfaz.');
            alert('No se puede confirmar el cambio de la incidencia. Recargue la aplicación.');
            return;
        }
        if (btn.disabled) return;
        const accion = window.accionPendienteSync;
        if (!accion) return;
        if (accion.tipo === 'eliminar' && !window.esSuperAdmin) return alert("Acceso Denegado: Solo el Super Admin puede eliminar registros permanentemente.");
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
        btn.disabled = true;
        const { cId, rowId } = accion;
        const ref = db.collection('eventos_historicos').doc(rowId);
        try {
            if (accion.tipo === 'guardar') {
                const intervalo = validarIntervaloIncidencia(accion.data);
                const fechaOperacional = calcularFechaReporteOperacional(intervalo.inicio, accion.horaCorte || '07:30');
                const periodo = obtenerPeriodoReporte(document.getElementById('ru-fecha').value, window.datosActuales.horaInicio || '07:30', window.datosActuales.horaFin || '07:30');
                const actual = window.datosActuales[cId]?.eventos?.find(evt => evt.id === rowId);
                const snap = await ref.get({ source: 'server' });
                if (actual && !snap.exists) throw new Error('La incidencia ya no existe en el histórico. Sincronice antes de editar.');
                if (!actual && snap.exists) throw new Error('El ID ya existe. Sincronice antes de crear otra incidencia.');
                const metadata = snap.exists ? snap.data() : {};
                const nombre = window.opcionesGlobales.centros.find(centro => centro.replace(/\s+/g, '').toLowerCase() === cId) || cId;
                const evt = { ...accion.data, oculto: metadata.oculto === true,
                    id_centro: metadata.id_centro || cId, nombre_centro: metadata.nombre_centro || nombre,
                    fecha_reporte: fechaOperacional,
                    timestamp_actualizacion: firebase.firestore.FieldValue.serverTimestamp() };
                if (snap.exists) await ref.update(evt);
                else await ref.set(evt);
                // Sólo actualizar memoria y tarjeta después de confirmar la escritura canónica.
                const centro = window.datosActuales[cId];
                if (centro) {
                    centro.eventos = (centro.eventos || []).filter(item => item.id !== rowId);
                    if (incidenciaPerteneceAlPeriodo(evt, periodo)) centro.eventos.push(evt);
                }
                const card = document.getElementById(`evt-${rowId}`);
                if (card) {
                    if (centro?.eventos.some(item => item.id === rowId)) {
                        card.innerHTML = renderizarFilaLectura(rowId, cId, evt);
                        card.classList.toggle('persistent-event', !evt.fechaHoraFin);
                        card.classList.toggle('oculto-exportacion', evt.oculto === true);
                    } else {
                        card.remove();
                        const [anio, mes, dia] = fechaOperacional.split('-');
                        alert(`La incidencia corresponde al reporte operacional del ${dia}/${mes}/${anio}.`);
                    }
                }
            } else if (accion.tipo === 'eliminar') {
                await ref.delete();
                Object.values(window.datosActuales).forEach(centro => {
                    if (Array.isArray(centro?.eventos)) centro.eventos = centro.eventos.filter(evt => evt.id !== rowId);
                });
                document.getElementById(`evt-${rowId}`)?.remove();
                console.info('[EliminarEvento] Histórico eliminado. ID:', rowId);
            }
            bootstrap.Modal.getOrCreateInstance(modal).hide();
            window.accionPendienteSync = null;
        } catch (error) {
            console.error('[Incidencias] No se pudo confirmar la operación:', error);
            alert(error.validacionTemporal ? error.message : 'No se pudo confirmar el cambio de la incidencia. Revise la conexión, los permisos y sincronice antes de reintentar.');
        } finally {
            btn.innerHTML = 'Confirmar Acción'; btn.disabled = false;
        }
    }

    window.sincronizarDesdeNube = async function() {
        const btn = document.getElementById('btn-sincronizar');
        if (btn) { 
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Sincronizando...'; 
            btn.disabled = true; 
        }
        
        const currentFecha = document.getElementById('ru-fecha').value;
        if (!currentFecha) {
            alert("Por favor, introduce o selecciona una fecha válida primero.");
            if (btn) { btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sincronizar'; btn.disabled = false; }
            return;
        }

        try {
            await window.cargarOpcionesGlobalesBD();
            await window.cargarReporteUnificado();
            
            if (btn) {
                btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> ¡Sincronizado!';
                btn.classList.replace('btn-outline-warning', 'btn-success');
                btn.classList.remove('text-dark');
                setTimeout(() => {
                    btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sincronizar';
                    btn.classList.replace('btn-success', 'btn-outline-warning');
                    btn.classList.add('text-dark');
                    btn.disabled = false;
                }, 1800);
            }
        } catch (error) {
            console.error("Error durante la sincronización manual:", error);
            alert("Error de red o permisos al descargar la información de la nube.");
            if (btn) {
                btn.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                setTimeout(() => {
                    btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sincronizar';
                    btn.disabled = false;
                }, 2000);
            }
        }
    }

    window.abrirConfiguracionOpciones = function() {
        renderizarListasConfiguracion();
        new bootstrap.Modal(document.getElementById('modalConfigOpciones')).show();
    }

    window.renderizarListasConfiguracion = function() {
        ['centros', 'firmantes', 'areas', 'categorias', 'parametros', 'condiciones', 'personal', 'motivos'].forEach(l => {
            const listDiv = document.getElementById(`lista-${l}`);
            if (listDiv) { listDiv.innerHTML = (window.opcionesGlobales[l] || []).map(opt => `<span class="config-tag">${opt} <button onclick="window.removerOpcion('${l}', '${opt}')">x</button></span>`).join(''); }
        });
        const selMotivo = document.getElementById('sel-padre-motivo');
        if (selMotivo) {
            const currentVal = selMotivo.value;
            const opcionesMotivos = window.opcionesGlobales.motivos || [];
            if (window.opcionesGlobales.submotivos) {
                Object.keys(window.opcionesGlobales.submotivos).forEach(k => {
                    if (!opcionesMotivos.includes(k)) opcionesMotivos.push(k);
                });
                window.opcionesGlobales.motivos = opcionesMotivos;
            }
            selMotivo.innerHTML = opcionesMotivos.map(m => `<option value="${m}">${m}</option>`).join('');
            if(currentVal && opcionesMotivos.includes(currentVal)) selMotivo.value = currentVal;
            window.actualizarListaSubmotivosConfig();
            selMotivo.removeEventListener('change', window.actualizarListaSubmotivosConfig);
            selMotivo.addEventListener('change', window.actualizarListaSubmotivosConfig);
        }
    }

    window.actualizarListaSubmotivosConfig = function() {
        const selPadre = document.getElementById('sel-padre-motivo');
        const contenedor = document.getElementById('lista-submotivos');
        if (!selPadre || !selPadre.value) { contenedor.innerHTML = '<span class="text-muted small">Seleccione un motivo principal</span>'; return; }
        const padre = selPadre.value.trim();
        let subs = [];
        if (window.opcionesGlobales.submotivos) {
            const exactKey = Object.keys(window.opcionesGlobales.submotivos).find(k => k.trim().toLowerCase() === padre.toLowerCase());
            if (exactKey) { subs = window.opcionesGlobales.submotivos[exactKey]; }
        }
        contenedor.innerHTML = subs.length === 0 ? '<span class="text-muted small">Sin submotivos enlazados.</span>' : subs.map(s => `<span class="config-tag">${s} <button onclick="window.removerSubmotivo('${padre}', '${s}')">x</button></span>`).join('');
    }

    window.agregarOpcion = function(l, id) { let v = document.getElementById(id).value.trim(); if(v) { if(!window.opcionesGlobales[l]) window.opcionesGlobales[l] = []; window.opcionesGlobales[l].push(v); document.getElementById(id).value = ''; renderizarListasConfiguracion(); } }
    window.removerOpcion = function(l, v) { window.opcionesGlobales[l] = window.opcionesGlobales[l].filter(o => o !== v); renderizarListasConfiguracion(); }
    window.agregarPersonal = function() { const nom = document.getElementById('nuevo-pers-nombre').value.trim(); const car = document.getElementById('nuevo-pers-cargo').value.trim(); if (nom) { const val = car ? `${nom}, ${car}` : nom; if(!window.opcionesGlobales.personal) window.opcionesGlobales.personal = []; window.opcionesGlobales.personal.push(val); document.getElementById('nuevo-pers-nombre').value = ''; document.getElementById('nuevo-pers-cargo').value = ''; renderizarListasConfiguracion(); } }
    window.agregarSubmotivo = function() { const selPadre = document.getElementById('sel-padre-motivo'); if(!selPadre) return; const padre = selPadre.value.trim(); const valor = document.getElementById('nuevo-submotivo').value.trim(); if (padre && valor) { if (!window.opcionesGlobales.submotivos) window.opcionesGlobales.submotivos = {}; const exactKey = Object.keys(window.opcionesGlobales.submotivos).find(k => k.trim().toLowerCase() === padre.toLowerCase()) || padre; if (!window.opcionesGlobales.submotivos[exactKey]) window.opcionesGlobales.submotivos[exactKey] = []; if (!window.opcionesGlobales.submotivos[exactKey].includes(valor)) { window.opcionesGlobales.submotivos[exactKey].push(valor); } document.getElementById('nuevo-submotivo').value = ''; window.actualizarListaSubmotivosConfig(); } }
    window.removerSubmotivo = function(padre, sub) { const exactKey = Object.keys(window.opcionesGlobales.submotivos).find(k => k.trim().toLowerCase() === padre.trim().toLowerCase()); if (exactKey) { window.opcionesGlobales.submotivos[exactKey] = window.opcionesGlobales.submotivos[exactKey].filter(s => s !== sub); window.actualizarListaSubmotivosConfig(); } }
    window.guardarConfiguracionNube = async function() { try { await db.collection('menus').doc('opciones_unificadas').set(window.opcionesGlobales, { merge: true }); bootstrap.Modal.getInstance(document.getElementById('modalConfigOpciones')).hide(); window.cargarReporteUnificado(); alert("Opciones guardadas y sincronizadas con la nube."); } catch(e) { alert("Error al guardar opciones."); } }

    function getFechaActualLocal() { return formatearFechaHoraLocal(new Date(), false); }
    function formatFechaDate(iso) { if(!iso) return '-'; if(iso.includes('T')) { const p = iso.split('T')[0].split('-'); if(p.length === 3) return `${p[2]}/${p[1]}`; } return iso.split(' ')[0] || iso; }
    function formatFechaTime(iso) { if(!iso) return '-'; if(iso.includes('T')) return iso.split('T')[1].substring(0,5); return iso.split(' ')[1] || '-'; }
    function formatearParametroHTML(texto) { if(!texto) return '-'; const match = texto.match(/(.*?)\s*(\[.*?\])/); if(match) return `<span class="fw-bold">${match[1]}</span><span class="d-block text-muted fw-normal" style="font-size:0.65rem; margin-top:-2px;">${match[2]}</span>`; return `<span class="fw-bold">${texto}</span>`; }
    function generarId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

    window.sincronizarRango = function() {
        const fecha = document.getElementById('ru-fecha').value;
        if (!fecha) return;
        const periodo = obtenerPeriodoReporte(fecha, document.getElementById('ru-hora-inicio').value || '07:30', document.getElementById('ru-hora-fin').value || '07:30');
        const formato = valor => formatearFechaLocal(valor).split('-').reverse().join('/');
        const inicio = document.getElementById('ru-lbl-fecha-ini');
        const fin = document.getElementById('ru-lbl-fecha-fin');
        if (inicio) inicio.innerText = formato(periodo.inicio);
        if (fin) fin.innerText = formato(periodo.fin);
    }
    window.sincronizarHoraFin = function() { document.getElementById('ru-hora-fin').value = document.getElementById('ru-hora-inicio').value; }
    window.actualizarEtiquetasFecha = function(input, idDate, idTime) { if(input.value) { document.getElementById(idDate).innerText = formatFechaDate(input.value); document.getElementById(idTime).innerText = formatFechaTime(input.value); } else { document.getElementById(idDate).innerText = '--/--'; document.getElementById(idTime).innerText = '--:--'; } }
    function generarOptionsList(arrayOpciones, valorSeleccionado) { let html = `<option value="">-- - --</option>`; if(arrayOpciones) { arrayOpciones.forEach(opt => { html += `<option value="${opt}" ${(opt === valorSeleccionado) ? 'selected' : ''}>${opt}</option>`; }); } return html; }

    window.cargarReporteUnificado = async function() {
        const fecha = document.getElementById('ru-fecha').value; if (!fecha) return;
        try {
            const reporte = await window.obtenerDesdeBD(fecha);
            const datos = { responsables: reporte?.responsables || [],
                horaInicio: reporte?.horaInicio || document.getElementById('ru-hora-inicio').value || '07:30',
                horaFin: reporte?.horaFin || document.getElementById('ru-hora-fin').value || '07:30' };
            window.opcionesGlobales.centros.forEach(nombre => {
                const cId = nombre.replace(/\s+/g, '').toLowerCase();
                const centro = reporte?.[cId] || {};
                // No copiar ni inspeccionar centro.eventos: esos arrays son datos legacy.
                datos[cId] = { cabana: centro.cabana || '', tarde: centro.tarde || '', noche: centro.noche || '', novedades: centro.novedades || '', eventos: [] };
            });
            await cargarIncidenciasHistoricas(datos, obtenerPeriodoReporte(fecha, datos.horaInicio, datos.horaFin));
            if (document.getElementById('ru-fecha').value !== fecha) return;
            window.datosActuales = datos;
            renderizarUICompleta();
            window.sincronizarRango();
        } catch (error) {
            console.error('[Incidencias] No se pudo cargar el reporte canónico:', error);
            alert('No se pudieron cargar las incidencias del reporte. Revise la conexión y los permisos, y sincronice.');
        }
    }

    function renderizarUICompleta() {
        const respContainer = document.getElementById('ru-responsables-container');
        if (respContainer) {
            let respHtml = '';
            const cantidad = window.opcionesGlobales.numResponsables || 3;
            for (let i = 1; i <= cantidad; i++) {
                const valorResponsable = window.datosActuales.responsables[i-1] || '';
                respHtml += `<div class="d-flex align-items-center flex-shrink-0"><label class="fw-bold text-secondary small me-1 text-nowrap">Resp. ${i}:</label><select id="ru-resp-${i}" class="form-select form-select-sm d-inline-block" style="width: max-content; min-width: 150px; max-width: 100%;" onchange="window.guardarReporteUnificado()">${generarOptionsList(window.opcionesGlobales.firmantes, valorResponsable)}</select></div>`;
            }
            respContainer.innerHTML = respHtml;
        }

        if(window.datosActuales.horaInicio) document.getElementById('ru-hora-inicio').value = window.datosActuales.horaInicio;
        if(window.datosActuales.horaFin) document.getElementById('ru-hora-fin').value = window.datosActuales.horaFin;

        const contenedor = document.getElementById('grilla-centros');
        let html = '';
        
        window.opcionesGlobales.centros.forEach(centro => {
            const cId = centro.replace(/\s+/g, '').toLowerCase(); const dataC = window.datosActuales[cId];
            html += `
            <div class="col-lg-6 col-md-12">
                <div class="piscicultura-col" id="panel-centro-${cId}">
                    <div class="piscicultura-title position-relative"><span>${centro}</span>
                        <div class="position-absolute end-0 top-50 translate-middle-y pe-2" data-html2canvas-ignore="true">
                            <button class="btn-title-action btn-title-action-new" onclick="window.capturarCentroConEncabezado('${cId}', '${centro}', 'copiar')" title="Copiar Centro + ENCABEZADO GLOBAL (Curado)"><i class="bi bi-clipboard-check-fill"></i></button>
                            <button class="btn-title-action btn-title-action-new text-warning border-0" onclick="window.capturarCentroConEncabezado('${cId}', '${centro}', 'descargar')" title="Descargar Centro + ENCABEZADO GLOBAL (Curado)"><i class="bi bi-file-earmark-image-fill"></i></button>
                        </div>
                    </div>
                    <div class="piscicultura-body">
                        
                        <div class="row g-2 mb-2 shift-grid">
                            <div class="col-4">
                                <div class="shift-card shift-permanencia h-100">
                                    <div class="shift-card-accent"></div>
                                    <div class="shift-card-content">
                                        <div class="shift-label"><i class="bi bi-house-heart-fill text-corp"></i> Permanencia</div>
                                        <div id="ru-${cId}-cabana" class="turno-editable shift-person text-start p-0 border-0" contenteditable="true" onblur="window.guardarReporteUnificado()">${dataC.cabana || ''}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="shift-card shift-tarde h-100">
                                    <div class="shift-card-accent"></div>
                                    <div class="shift-card-content">
                                        <div class="shift-label"><i class="bi bi-sun-fill text-warning"></i> Tarde</div>
                                        <div id="ru-${cId}-tarde" class="turno-editable shift-person text-start p-0 border-0" contenteditable="true" onblur="window.guardarReporteUnificado()">${dataC.tarde || ''}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="shift-card shift-noche h-100">
                                    <div class="shift-card-accent"></div>
                                    <div class="shift-card-content">
                                        <div class="shift-label"><i class="bi bi-moon-stars-fill" style="color:#425ea8"></i> Noche</div>
                                        <div id="ru-${cId}-noche" class="turno-editable shift-person text-start p-0 border-0" contenteditable="true" onblur="window.guardarReporteUnificado()">${dataC.noche || ''}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="toolbar mb-1 bg-light border rounded p-1 d-flex gap-1 justify-content-center flex-wrap" data-html2canvas-ignore="true">
                            <button class="toolbar-btn fw-bold" onmousedown="event.preventDefault(); document.execCommand('bold')">B</button>
                            <button class="toolbar-btn text-decoration-underline" onmousedown="event.preventDefault(); document.execCommand('underline')">U</button>
                            <button class="toolbar-btn" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList')" title="Viñetas"><i class="bi bi-list-ul"></i></button>
                            <button class="toolbar-btn" onmousedown="event.preventDefault(); document.execCommand('justifyLeft')" title="Alinear a la Izquierda"><i class="bi bi-text-left"></i></button>
                            <button class="toolbar-btn" onmousedown="event.preventDefault(); document.execCommand('justifyCenter')" title="Centrar texto"><i class="bi bi-text-center"></i></button>
                            <div class="border-end mx-1"></div>
                            <button class="toolbar-btn fw-bold" style="color: #198754;" onmousedown="event.preventDefault(); document.execCommand('foreColor', false, '#198754')">A</button>
                            <button class="toolbar-btn fw-bold" style="color: #0d6efd;" onmousedown="event.preventDefault(); document.execCommand('foreColor', false, '#0d6efd')">A</button>
                            <button class="toolbar-btn fw-bold" style="color: #dc3545;" onmousedown="event.preventDefault(); document.execCommand('foreColor', false, '#dc3545')">A</button>
                            <button class="toolbar-btn fw-bold text-dark" onmousedown="event.preventDefault(); document.execCommand('foreColor', false, 'black')">A</button>
                            <div class="border-end mx-1"></div>
                            <button class="toolbar-btn text-secondary" onmousedown="event.preventDefault(); document.execCommand('removeFormat')" title="Limpiar Formato"><i class="bi bi-eraser-fill"></i></button>
                        </div>
                        <div><label class="fw-bold text-secondary mb-1 small">Novedades</label><div id="nov-${cId}" class="notebook-editable text-start" contenteditable="true" onblur="window.guardarReporteUnificado()">${dataC.novedades || ''}</div></div>
                        <div class="alert-box mt-auto">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="alert-title mb-0"><i class="bi bi-exclamation-triangle-fill me-1 text-danger"></i> Fallas y Alarmas <span class="ms-1 text-muted">(${(dataC.eventos || []).length})</span></span>
                                <button class="btn btn-sm btn-outline-secondary py-0 px-2 fw-bold bg-white" data-html2canvas-ignore="true" style="font-size: 0.875rem; border-color: #005f66; color: #005f66;" onclick="window.agregarFilaEvento('${cId}')"><i class="bi bi-plus-lg"></i> Añadir</button>
                            </div>
                            <div id="lista-evt-${cId}">${generarHTMLListaEventos(cId, dataC.eventos)}</div>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        contenedor.innerHTML = html;
    }

    function generarHTMLListaEventos(cId, eventosArray) {
        if (!eventosArray || eventosArray.length === 0) return `<div id="empty-${cId}" class="text-center text-muted fst-italic py-2 bg-white border rounded" style="font-size: 1rem;"><i class="bi bi-check-circle-fill me-1 text-secondary"></i>Sin fallas ni alarmas en el período</div>`;
        let evHtml = '';
        eventosArray.forEach(evt => { evHtml += `<div id="evt-${evt.id}" class="event-card mb-3 shadow-sm ${!evt.fechaHoraFin ? 'persistent-event' : ''} ${evt.oculto ? 'oculto-exportacion' : ''}">${renderizarFilaLectura(evt.id, cId, evt)}</div>`; });
        return evHtml;
    }

    let matrizRowContext = null;
    window.abrirMatrizEstanques = function(rowId) {
        matrizRowContext = rowId;
        const rawVals = document.getElementById(`est_${rowId}`).value || "";
        const selArray = rawVals.split(',').map(s => s.trim()).filter(Boolean);
        let gridHtml = '';
        for(let i=1; i<=60; i++) {
            const isSel = selArray.includes(i.toString());
            const cl = isSel ? 'tank-matrix-btn selected' : 'tank-matrix-btn btn-outline-secondary';
            gridHtml += `<button class="btn btn-sm ${cl}" onclick="this.classList.toggle('selected'); this.classList.toggle('btn-outline-secondary');">${i}</button>`;
        }
        document.getElementById('grid-estanques').innerHTML = gridHtml;
        new bootstrap.Modal(document.getElementById('modalMatrizEstanques')).show();
    }
    
    window.limpiarMatriz = function() {
        document.querySelectorAll('.tank-matrix-btn').forEach(btn => {
            btn.classList.remove('selected'); btn.classList.add('btn-outline-secondary');
        });
    }

    window.guardarMatriz = function() {
        const activeBtns = document.querySelectorAll('.tank-matrix-btn.selected');
        const vals = Array.from(activeBtns).map(b => b.innerText);
        const str = vals.join(', ');
        document.getElementById(`est_${matrizRowContext}`).value = str;
        document.getElementById(`display_est_${matrizRowContext}`).innerHTML = str ? vals.map(e => `<span class="tank-badge">${e}</span>`).join(' ') : '<span class="text-muted small">Seleccionar</span>';
        bootstrap.Modal.getInstance(document.getElementById('modalMatrizEstanques')).hide();
    }

    window.agregarFilaEvento = function(cId) {
        document.getElementById(`empty-${cId}`)?.remove(); 
        const div = document.createElement('div'); div.id = `evt-${generarId()}`; div.className = 'event-card mb-3 shadow-sm persistent-event';
        div.innerHTML = renderizarFilaEdicion(div.id.replace('evt-', ''), cId, {});
        document.getElementById(`lista-evt-${cId}`).appendChild(div);
    }

    window.actualizarSubmotivosDropdownEvento = function(rowId) {
        const motInput = document.getElementById(`mot_${rowId}`);
        const sub = document.getElementById(`sub_${rowId}`);
        if(!motInput || !sub) return;
        const mot = motInput.value.trim();
        let subsList = [];
        if (window.opcionesGlobales.submotivos) {
            const exactKey = Object.keys(window.opcionesGlobales.submotivos).find(k => k.trim().toLowerCase() === mot.toLowerCase());
            if (exactKey) subsList = window.opcionesGlobales.submotivos[exactKey];
        }
        sub.innerHTML = generarOptionsList(subsList, '');
    }

    window.agregarInputPersona = function(rowId) {
        const div = document.getElementById(`caja_per_${rowId}`);
        if(!div) return;
        const wrap = document.createElement('div');
        wrap.className = 'd-flex align-items-center gap-1 mb-1 per-wrap';
        wrap.innerHTML = `
            <select class="context-input px-1 py-0 w-100 sel-per-${rowId}">${generarOptionsList(window.opcionesGlobales.personal, '')}</select>
            <button type="button" class="btn btn-sm py-0 px-1 text-danger border-0" onclick="this.parentElement.remove()" title="Quitar persona"><i class="bi bi-dash-circle-fill"></i></button>
        `;
        div.appendChild(wrap);
    }

    function renderizarFilaEdicion(rowId, cId, objData) {
        const iniVal = objData.fechaHora || getFechaActualLocal(); const finVal = objData.fechaHoraFin || '';
        let subsList = [];
        if (window.opcionesGlobales.submotivos && objData.motivo) {
            const exactKey = Object.keys(window.opcionesGlobales.submotivos).find(k => k.trim().toLowerCase() === objData.motivo.trim().toLowerCase());
            if (exactKey) subsList = window.opcionesGlobales.submotivos[exactKey];
        }

        let personasArr = objData.persona ? objData.persona.split('|').map(s => s.trim()).filter(Boolean) : [''];
        if (personasArr.length === 0) personasArr = [''];
        let personasHtml = '';
        personasArr.forEach((p) => { 
            personasHtml += `
            <div class="d-flex align-items-center gap-1 mb-1 per-wrap w-100">
                <select class="context-input px-1 py-0 w-100 sel-per-${rowId}">${generarOptionsList(window.opcionesGlobales.personal, p)}</select>
                <button type="button" class="btn btn-sm py-0 px-1 text-danger border-0" onclick="this.parentElement.remove()" title="Quitar persona"><i class="bi bi-dash-circle-fill"></i></button>
            </div>`; 
        });

        return `
            <div class="context-header">
                <div class="d-flex flex-nowrap gap-1 align-items-end mb-1 w-100" style="overflow-x: auto; padding-bottom: 2px;">
                    
                    <div class="flex-shrink-0" style="width: 75px;">
                        <span class="text-muted fw-bold text-uppercase mb-1 d-block" style="font-size: 0.55rem; letter-spacing: 0.5px;">Inicio</span>
                        <div class="data-capsule px-1 justify-content-center" onclick="document.getElementById('fec_${rowId}').showPicker()" style="cursor: pointer;">
                            <i class="bi bi-play-circle-fill text-success me-1" style="font-size: 0.9rem;"></i> 
                            <div class="d-flex flex-column text-center lh-1">
                                <span class="fw-bold date-txt" id="lbl_fec_${rowId}_d" style="font-size: 0.7rem; color:#343a40;">${formatFechaDate(iniVal)}</span>
                                <span class="text-muted time-txt" id="lbl_fec_${rowId}_t" style="font-size: 0.6rem; margin-top: 2px;">${formatFechaTime(iniVal)}</span>
                            </div>
                        </div>
                        <input type="datetime-local" id="fec_${rowId}" class="position-absolute" style="opacity: 0; z-index: -1; pointer-events: none;" value="${iniVal}" onchange="window.actualizarEtiquetasFecha(this, 'lbl_fec_${rowId}_d', 'lbl_fec_${rowId}_t')">
                    </div>

                    <div class="flex-shrink-0" style="width: 75px;">
                        <span class="text-muted fw-bold text-uppercase mb-1 d-block" style="font-size: 0.55rem; letter-spacing: 0.5px;">Fin</span>
                        <div class="data-capsule px-1 justify-content-center" onclick="document.getElementById('fec_fin_${rowId}').showPicker()" style="cursor: pointer;">
                            <i class="bi bi-stop-circle-fill text-danger me-1" style="font-size: 0.9rem;"></i> 
                            <div class="d-flex flex-column text-center lh-1">
                                <span class="fw-bold date-txt" id="lbl_fec_fin_${rowId}_d" style="font-size: 0.7rem; color:#343a40;">${finVal ? formatFechaDate(finVal) : '--/--'}</span>
                                <span class="text-muted time-txt" id="lbl_fec_fin_${rowId}_t" style="font-size: 0.6rem; margin-top: 2px;">${finVal ? formatFechaTime(finVal) : '--:--'}</span>
                            </div>
                        </div>
                        <input type="datetime-local" id="fec_fin_${rowId}" class="position-absolute" style="opacity: 0; z-index: -1; pointer-events: none;" value="${finVal}" onchange="window.actualizarEtiquetasFecha(this, 'lbl_fec_fin_${rowId}_d', 'lbl_fec_fin_${rowId}_t')">
                    </div>

                    <div class="flex-grow-1" style="min-width: 90px; max-width: 220px;">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="text-muted fw-bold text-uppercase" style="font-size: 0.55rem; letter-spacing: 0.5px;">Personal Atiende</span>
                            <button class="btn btn-sm py-0 px-1 border-0 text-success" style="font-size: 0.65rem; line-height: 1;" onclick="window.agregarInputPersona('${rowId}')" title="Añadir persona al evento"><i class="bi bi-plus-circle-fill"></i></button>
                        </div>
                        <div id="caja_per_${rowId}" class="d-flex flex-column gap-0 w-100">
                            ${personasHtml}
                        </div>
                    </div>

                    <div class="flex-grow-1" style="min-width: 80px; max-width: 180px;">
                        <span class="text-muted fw-bold text-uppercase mb-1 d-block" style="font-size: 0.55rem; letter-spacing: 0.5px;">Motivo Principal</span>
                        <div class="data-capsule px-2 w-100"><i class="bi bi-tools text-corp me-1" style="font-size: 0.85rem;"></i> <select id="mot_${rowId}" class="data-capsule-select" onchange="window.actualizarSubmotivosDropdownEvento('${rowId}')">${generarOptionsList(window.opcionesGlobales.motivos, objData.motivo)}</select></div>
                    </div>

                    <div class="flex-grow-1" style="min-width: 80px; max-width: 180px;">
                        <span class="text-muted fw-bold text-uppercase mb-1 d-block" style="font-size: 0.55rem; letter-spacing: 0.5px;">Sub-Motivo</span>
                        <div class="data-capsule px-2 w-100"><i class="bi bi-arrow-return-right text-muted me-1" style="font-size: 0.85rem;"></i> <select id="sub_${rowId}" class="data-capsule-select">${generarOptionsList(subsList, objData.submotivo)}</select></div>
                    </div>

                    <div class="flex-shrink-0 ms-auto" style="width: 55px;">
                        <span class="text-muted fw-bold text-uppercase mb-1 d-block text-center" style="font-size: 0.55rem; letter-spacing: 0.5px;">Cant.</span>
                        <div class="data-capsule px-1 justify-content-center">
                            <input type="number" id="ocu_${rowId}" class="data-capsule-select text-center w-100" style="min-height: 20px;" value="${objData.ocurrencias || '1'}">
                        </div>
                    </div>
                </div>
                
                <div class="row mt-2">
                    <div class="col-12">
                        <div class="d-flex align-items-center gap-2 px-2 py-1 bg-white shadow-sm" style="border-left: 4px solid #0096a0; border-right: 4px solid #0096a0; border-radius: 4px;">
                            <span class="text-corp fw-bold text-nowrap" style="font-size: 0.65rem; letter-spacing: 0.5px;"><i class="bi bi-chat-left-text-fill me-1"></i>COMENTARIO:</span>
                            <input type="text" id="com_${rowId}" class="form-control context-input flex-grow-1 border-0 shadow-none px-1 py-0" style="font-size: 0.75rem; background: transparent;" placeholder="Escriba aquí sus notas u observaciones..." value="${objData.comentario || ''}">
                        </div>
                    </div>
                </div>
            </div>
            
            <table class="event-table">
                <thead><tr><th style="width: 8%">Tipo</th><th style="width: 12%">Equipo</th><th style="width: 18%">Parámetro</th><th style="width: 11%">Condición</th><th style="width: 9%">Valor</th><th style="width: 14%">Área</th><th style="width: 19%">Estanque(s)</th><th style="width: 9%" data-html2canvas-ignore="true">Act</th></tr></thead>
                <tbody>
                    <tr class="row-edit">
                        <td><select id="t_${rowId}" class="event-select text-danger fw-bold"><option value="Falla" ${objData.tipo==='Falla'?'selected':''}>Falla</option><option value="Alarma" ${objData.tipo==='Alarma'?'selected':''}>Alarma</option></select></td>
                        <td><select id="cat_${rowId}" class="event-select">${generarOptionsList(window.opcionesGlobales.categorias, objData.categoria)}</select></td>
                        <td><select id="par_${rowId}" class="event-select">${generarOptionsList(window.opcionesGlobales.parametros, objData.parametro)}</select></td>
                        <td><select id="con_${rowId}" class="event-select">${generarOptionsList(window.opcionesGlobales.condiciones, objData.condicion)}</select></td>
                        <td><input type="text" id="val_${rowId}" class="event-input fw-bold text-danger text-center" value="${objData.valor || ''}"></td>
                        <td><select id="are_${rowId}" class="event-select">${generarOptionsList(window.opcionesGlobales.areas, objData.area)}</select></td>
                        <td>
                            <input type="hidden" id="est_${rowId}" value="${objData.estanques || ''}">
                            <div id="display_est_${rowId}" class="mb-0 bg-light rounded text-center d-flex flex-wrap justify-content-center align-items-center" style="min-height: 25px; border: 1px solid #ced4da; cursor: pointer; padding: 2px;" onclick="window.abrirMatrizEstanques('${rowId}')">
                                ${objData.estanques ? objData.estanques.split(',').map(e => `<span class="tank-badge">${e.trim()}</span>`).join(' ') : '<span class="text-muted small">Malla Visual</span>'}
                            </div>
                        </td>
                        <td class="text-center p-1" data-html2canvas-ignore="true"><div class="d-flex gap-1 justify-content-center"><button class="btn-event bg-success text-white w-100" onclick="window.prepararGuardadoEvento('${rowId}', '${cId}')"><i class="bi bi-check-lg"></i></button></div></td>
                    </tr>
                </tbody>
            </table>`;
    }

    window.toggleVisibilidadCuracion = async function(btn, rowId, cId) {
        if (btn.disabled) return;
        const evt = window.datosActuales[cId]?.eventos?.find(item => item.id === rowId);
        if (!evt) return;
        const oculto = evt.oculto !== true;
        btn.disabled = true;
        try {
            await db.collection('eventos_historicos').doc(rowId).update({ oculto,
                timestamp_edicion: Date.now(), timestamp_actualizacion: firebase.firestore.FieldValue.serverTimestamp() });
            Object.values(window.datosActuales).forEach(centro => {
                if (Array.isArray(centro?.eventos)) centro.eventos.forEach(item => { if (item.id === rowId) item.oculto = oculto; });
            });
            const card = document.getElementById(`evt-${rowId}`);
            const icon = btn.querySelector('i');
            card?.classList.toggle('oculto-exportacion', oculto);
            if (oculto) { icon.classList.replace('bi-eye', 'bi-eye-slash'); btn.classList.replace('btn-outline-secondary', 'btn-secondary'); }
            else { icon.classList.replace('bi-eye-slash', 'bi-eye'); btn.classList.replace('btn-secondary', 'btn-outline-secondary'); }
        } catch (error) {
            console.error('[Incidencias] No se pudo cambiar la visibilidad:', error);
            alert('No se pudo guardar la visibilidad de la incidencia. Revise la conexión y los permisos.');
        } finally { btn.disabled = false; }
    }

    function renderizarFilaLectura(rowId, cId, objData) {
        const isPersistent = !objData.fechaHoraFin;
        const esAlarma = (objData.tipo || '').toLowerCase() === 'alarma';
        const claseTipo = esAlarma ? 'event-alarma' : 'event-falla';
        const claseEstado = isPersistent ? 'event-open' : 'event-closed';
        const etiquetaEstado = isPersistent ? 'EN CURSO' : 'FINALIZADA';
        const iconoTipo = esAlarma ? 'bi-bell-fill' : 'bi-exclamation-circle-fill';
        const p = objData.persona ? objData.persona.split('|').map(s => s.trim()).filter(Boolean) : [];
        const btnClassEye = objData.oculto ? "btn-secondary" : "btn-outline-secondary";
        const iconEye = objData.oculto ? "bi-eye-slash" : "bi-eye";

        let duracionStr = '-';
        let timerClass = '';
        let timerAttr = '';
        if (objData.fechaHora) {
            const fin = isPersistent ? new Date() : new Date(objData.fechaHoraFin);
            const ini = new Date(objData.fechaHora);
            const ms = fin - ini;
            if (ms >= 0) {
                const horas = Math.floor(ms / 3600000);
                const minutos = Math.floor((ms % 3600000) / 60000);
                duracionStr = `${horas}h ${minutos}m`;
            }
            if (isPersistent) {
                timerClass = 'live-timer';
                timerAttr = `data-start="${objData.fechaHora}"`;
            }
        }

        const parametroTexto = objData.parametro ? objData.parametro.replace(/\s*\[.*?\]\s*/g, '').trim() : '';
        const tituloEvento = [parametroTexto, objData.condicion].filter(Boolean).join(' · ') || objData.motivo || objData.tipo || 'Evento';
        const ubicacion = [objData.area, objData.estanques ? `Est. ${objData.estanques}` : ''].filter(Boolean).join(' · ') || 'Ubicación no indicada';
        const personas = p.length ? p.join(' · ') : '-';
        const fechaInicio = objData.fechaHora ? `${formatFechaDate(objData.fechaHora)} ${formatFechaTime(objData.fechaHora)}` : '-';
        const fechaFin = isPersistent ? 'En curso' : (objData.fechaHoraFin ? `${formatFechaDate(objData.fechaHoraFin)} ${formatFechaTime(objData.fechaHoraFin)}` : '-');
        const comentario = objData.comentario || 'Sin observaciones detalladas.';

        return `
            <div class="event-display ${claseTipo} ${claseEstado}">
                <div class="event-topline">
                    <div class="event-status-group">
                        <span class="event-type-chip"><i class="bi ${iconoTipo}"></i>${objData.tipo || 'Falla'}</span>
                        <span class="event-state-chip">${etiquetaEstado}</span>
                    </div>
                    <div class="event-duration ${timerClass}" ${timerAttr}><i class="bi bi-clock"></i>${duracionStr}</div>
                </div>

                <div class="event-main">
                    <div class="event-headline-row">
                        <div>
                            <div class="event-headline">${tituloEvento}</div>
                            <div class="event-location"><i class="bi bi-geo-alt me-1"></i>${ubicacion}</div>
                        </div>
                        <div class="event-value-box">
                            <span class="event-value-label">Valor</span>
                            <span class="event-value">${objData.valor || '-'}</span>
                        </div>
                    </div>
                    <div class="event-comment-compact event-general-only"><i class="bi bi-chat-left-text-fill"></i>${comentario}</div>
                </div>

                <div class="event-detail-only">
                    <div class="event-detail-layout">
                        <div class="event-narrative">
                            <div class="event-narrative-item">
                                <span class="event-kicker">Motivo principal</span>
                                <strong>${objData.motivo || '-'}</strong>
                            </div>
                            <div class="event-narrative-item">
                                <span class="event-kicker">Sub-motivo</span>
                                <strong>${objData.submotivo || '-'}</strong>
                            </div>
                            <div class="event-narrative-item">
                                <span class="event-kicker">Comentario</span>
                                <p>${comentario}</p>
                            </div>
                        </div>

                        <div class="event-meta-grid">
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-calendar-event"></i>Inicio</span><div class="event-meta-value">${fechaInicio}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-calendar-check"></i>Fin</span><div class="event-meta-value">${fechaFin}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-stopwatch"></i>Duración</span><div class="event-meta-value ${timerClass}" ${timerAttr}>${duracionStr}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-people"></i>Personal atiende</span><div class="event-meta-value">${personas}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi ${iconoTipo}"></i>Tipo</span><div class="event-meta-value">${objData.tipo || '-'}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-gear"></i>Equipo</span><div class="event-meta-value">${objData.categoria || '-'}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-activity"></i>Parámetro</span><div class="event-meta-value">${objData.parametro || '-'}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-arrow-down-up"></i>Condición</span><div class="event-meta-value">${objData.condicion || '-'}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-exclamation-lg"></i>Valor</span><div class="event-meta-value highlight">${objData.valor || '-'}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-layers"></i>Área</span><div class="event-meta-value">${objData.area || '-'}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-grid-3x3-gap"></i>Estanques</span><div class="event-meta-value">${objData.estanques || '-'}</div></div>
                            <div class="event-meta"><span class="event-meta-label"><i class="bi bi-arrow-repeat"></i>N° ocurrencias</span><div class="event-meta-value">${objData.ocurrencias || '1'}</div></div>
                        </div>
                    </div>
                </div>

                <div class="event-actions" data-html2canvas-ignore="true">
                    <button class="btn-event bg-info text-dark" onclick="window.editarFilaEvento('${rowId}', '${cId}')" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn-event bg-danger text-white" onclick="window.prepararEliminacionEvento('${rowId}', '${cId}')" title="Borrar y Sincronizar"><i class="bi bi-trash3-fill"></i></button>
                    <button class="btn-event ${btnClassEye}" onclick="window.toggleVisibilidadCuracion(this, '${rowId}', '${cId}')" title="Ocultar de la Foto/Excel"><i class="bi ${iconEye}"></i> Foto</button>
                </div>
            </div>`;
    }

    window.editarFilaEvento = function(rowId, cId) { document.getElementById(`evt-${rowId}`).innerHTML = renderizarFilaEdicion(rowId, cId, window.datosActuales[cId].eventos.find(e => e.id === rowId) || {}); }
    
    function destruirModalForzado(modalId) {
        const el = document.getElementById(modalId);
        if (!el) return;
        const inst = bootstrap.Modal.getInstance(el);
        if (inst) inst.hide();
        
        el.classList.remove('show');
        el.style.display = 'none';
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    }

    /* EXPORTACIÓN Y DESCARGAS */
    window.capturarImagenPortapapeles = async function() {
        const el = document.getElementById('contenedor-reporte-unificado');
        const ocultos = el.querySelectorAll('.oculto-exportacion');
        const ignorados = el.querySelectorAll('[data-html2canvas-ignore="true"]');
        ocultos.forEach(e => e.style.display = 'none');
        ignorados.forEach(e => e.style.display = 'none');
        el.classList.add('export-general');
        try {
            await new Promise(r => setTimeout(r, 80));
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
            canvas.toBlob(async function(blob) {
                try { await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]); alert("Reporte general curado copiado."); } catch(err) {}
                ocultos.forEach(e => e.style.display = '');
                ignorados.forEach(e => e.style.display = '');
                el.classList.remove('export-general');
            });
        } catch(e) {
            ocultos.forEach(e => e.style.display = '');
            ignorados.forEach(e => e.style.display = '');
            el.classList.remove('export-general');
        }
    }

    window.capturarCentroConEncabezado = async function(cId, nombreCentro, accion) {
        const originalCentro = document.getElementById(`panel-centro-${cId}`);
        const tempDiv = document.createElement('div'); tempDiv.style.position = 'absolute'; tempDiv.style.left = '-9999px'; tempDiv.style.top = '0'; tempDiv.className = 'p-4 bg-white border rounded'; tempDiv.style.width = '750px'; tempDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif';

        const fechaEmi = document.getElementById('ru-fecha').value || 'Sin fecha'; const horaIni = document.getElementById('ru-hora-inicio').value; const horaFin = document.getElementById('ru-hora-fin').value; const lblIni = document.getElementById('ru-lbl-fecha-ini').innerText; const lblFin = document.getElementById('ru-lbl-fecha-fin').innerText;
        let responsablesText = []; for(let i=1; i<= (window.opcionesGlobales.numResponsables || 3); i++){ let select = document.getElementById(`ru-resp-${i}`); if(select && select.value) responsablesText.push(select.value); }
        
        const customHeader = document.createElement('div'); customHeader.style.marginBottom = '20px'; customHeader.style.paddingBottom = '15px'; customHeader.style.borderBottom = '2px solid #0096a0';
        customHeader.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: flex-start;"><div style="flex-grow: 1;"><h3 style="color: #0096a0; font-weight: 800; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Reporte Control Total</h3><p style="color: #6c757d; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Novedades, Fallas y Alarmas</p><div style="font-size: 16px; color: #495057; line-height: 1.6; background: #f8f9fa; padding: 12px 18px; border-radius: 6px; border: 1px solid #e9ecef; margin-right: 20px;"><div><strong style="color: #005f66;">Fecha de Emisión:</strong> ${fechaEmi}</div><div><strong style="color: #005f66;">Rango 24h Curado:</strong> ${horaIni} (${lblIni}) a ${horaFin} (${lblFin})</div><div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #ced4da;"><strong style="color: #005f66;">Responsables de Turno:</strong> ${responsablesText.length > 0 ? responsablesText.join(' | ') : 'Sin asignar'}</div></div></div><div style="text-align: right; padding-top: 5px;"><img src="im/logo1.jpg" style="height: 55px; object-fit: contain;" onerror="this.style.display='none'"></div></div>`;

        const cloneCentro = originalCentro.cloneNode(true); 
        cloneCentro.style.height = 'auto'; cloneCentro.style.border = 'none'; cloneCentro.style.boxShadow = 'none';
        
        cloneCentro.classList.add('force-wide-export', 'export-individual');
        
        cloneCentro.querySelectorAll('.oculto-exportacion').forEach(el => el.remove());
        cloneCentro.querySelectorAll('[data-html2canvas-ignore="true"]').forEach(el => el.remove());
        const origInputs = originalCentro.querySelectorAll('input, select, textarea'); const cloneInputs = cloneCentro.querySelectorAll('input, select, textarea');
        origInputs.forEach((inp, i) => { if(inp.type === 'checkbox' || inp.type === 'radio') cloneInputs[i].checked = inp.checked; else cloneInputs[i].value = inp.value; });
        tempDiv.appendChild(customHeader); tempDiv.appendChild(cloneCentro); document.body.appendChild(tempDiv);

        try {
            await new Promise(r => setTimeout(r, 150)); const canvas = await html2canvas(tempDiv, { scale: 2, backgroundColor: "#ffffff" });
            if (accion === 'copiar') { canvas.toBlob(async function(blob) { try { await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]); alert(`Reporte de ${nombreCentro} Curado y listo para pegar.`); } catch(err) {} document.body.removeChild(tempDiv); });
            } else { const link = document.createElement('a'); link.download = `Reporte_${nombreCentro}_Curado_${fechaEmi}.png`; link.href = canvas.toDataURL("image/png"); link.click(); document.body.removeChild(tempDiv); }
        } catch(e) { document.body.removeChild(tempDiv); }
    }

    window.descargarImagenTotal = async function() {
        const el = document.getElementById('contenedor-reporte-unificado');
        el.querySelectorAll('.oculto-exportacion').forEach(e => e.style.display = 'none');
        const dNoneElements = el.querySelectorAll('[data-html2canvas-ignore="true"]');
        dNoneElements.forEach(e => e.style.display = 'none');
        el.classList.add('export-general');

        try {
            await new Promise(r => setTimeout(r, 80));
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
            const link = document.createElement('a');
            const fechaEmi = document.getElementById('ru-fecha').value || 'Sin_fecha';
            link.download = `Reporte_General_CT_${fechaEmi}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch(e) { 
            alert("Hubo un problema al generar la descarga.");
            console.error(e);
        } finally {
            el.querySelectorAll('.oculto-exportacion').forEach(e => e.style.display = '');
            dNoneElements.forEach(e => e.style.display = '');
            el.classList.remove('export-general');
        }
    }

    window.descargarExcelEventos = async function() {
        if(!window.ExcelJS) return alert("Cargando librerías...");
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Eventos Curados');
        ws.addRow([`REPORTE UNIFICADO - EVENTOS FILTRADOS (${document.getElementById('ru-fecha').value})`]);
        ws.getRow(1).font = { bold: true, size: 14, color: { argb: '0096a0' } }; ws.addRow([]);
        
        ws.addRow(['CENTRO', 'FECHA/HORA INICIO', 'FECHA/HORA FIN', 'PERSONAL', 'MOTIVO', 'SUB-MOTIVO', 'COMENTARIOS', 'TIPO', 'EQUIPO', 'PARÁMETRO', 'CONDICIÓN', 'VALOR', 'ÁREA', 'ESTANQUES']);
        ws.getRow(3).font = { bold: true, color: { argb: 'FFFFFF' } }; ws.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0096A0' } };
        
        window.opcionesGlobales.centros.forEach(centro => {
            const cId = centro.replace(/\s+/g, '').toLowerCase();
            if(window.datosActuales[cId] && window.datosActuales[cId].eventos) {
                window.datosActuales[cId].eventos.forEach(evt => {
                    if (evt.oculto === true) return;
                    let paramLimpio = evt.parametro || '-'; const match = (evt.parametro||'').match(/(.*?)\s*\[(.*?)\]/); if(match) paramLimpio = match[1].trim() + " ("+match[2].trim()+")";
                    
                    let personasExcel = evt.persona ? evt.persona.replace(/\|/g, ', ') : '-';
                    
                    ws.addRow([ centro.toUpperCase(), evt.fechaHora ? evt.fechaHora.replace('T', ' ') : '', evt.fechaHoraFin ? evt.fechaHoraFin.replace('T', ' ') : 'EN CURSO', personasExcel, evt.motivo || '-', evt.submotivo || '-', evt.comentario || '-', evt.tipo, evt.categoria, paramLimpio, evt.condicion, isNaN(parseFloat(evt.valor)) ? evt.valor : parseFloat(evt.valor), evt.area, evt.estanques || '-' ]);
                });
            }
        });
        ws.columns = [ {width: 15}, {width: 20}, {width: 20}, {width: 25}, {width: 18}, {width: 18}, {width: 25}, {width: 12}, {width: 20}, {width: 18}, {width: 15}, {width: 10}, {width: 15}, {width: 18} ];
        ws.eachRow((row, rowN) => { if(rowN > 2) row.eachCell(c => { c.alignment = { vertical: 'middle', horizontal: 'center' }; c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; }); });
        
        const buf = await wb.xlsx.writeBuffer(); saveAs(new Blob([buf]), `Fallas_y_Alarmas_Curado_${document.getElementById('ru-fecha').value}.xlsx`);
    }

    setInterval(() => {
        document.querySelectorAll('.live-timer').forEach(el => {
            const startStr = el.getAttribute('data-start');
            if (startStr) {
                const ms = new Date() - new Date(startStr);
                if (ms >= 0) {
                    const h = Math.floor((ms/60000)/60);
                    const m = Math.floor((ms/60000)%60);
                    el.innerHTML = `<i class="bi bi-stopwatch"></i> ${h}h ${m}m`;
                }
            }
        });
    }, 60000); 
