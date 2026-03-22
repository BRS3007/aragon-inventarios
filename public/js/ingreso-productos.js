  let conteoSesion = 0;
document.addEventListener('DOMContentLoaded', () => {
    // 1. DECLARACIÓN DE VARIABLES (Al principio para que todos las vean)
    const formIngresoProductos = document.getElementById('form-ingreso-productos');
    const inputBarcode = document.getElementById('codigo_de_barras');
    const inputCodigo = document.getElementById('codigo');
    const inputDescripcion = document.getElementById('descripcion');
    const inputCantidad = document.getElementById('cantidad');
    const inputFecha = document.getElementById('fecha');
    const inputPrecio = document.getElementById('precio');
    const inputPasillo = document.getElementById('pasillo');
    const datalistSugerencias = document.getElementById('sugerencias-descripcion');
    const btnLimpiar = document.getElementById('btn-limpiar');
    const btnGuardar = document.querySelector('.btn-guardar'); // Usando la clase que agregamos
    const inputDesc = document.getElementById('descripcion');
    const dataList = document.getElementById('sugerencias-descripcion');

    console.log("ingreso-productos.js: Script cargado y variables listas.");

    // 2. SONIDOS (Modo dinámico para evitar errores de caché)
const reproducirSonido = (tipo) => {
    const ruta = tipo === 'exito' ? '/sounds/success.mp3' : '/sounds/error.mp3';
    // Agregamos ?v= seguido de un número único (timestamp)
    const audio = new Audio(`${ruta}?v=${Date.now()}`);
    
    audio.play().catch(err => {
        console.warn("El audio no pudo reproducirse (posible bloqueo del navegador o archivo faltante):", err);
    });
};
   
    

    // 3. CONFIGURACIÓN INICIAL (Fecha y Usuario)
    if (inputFecha) {
        const hoy = new Date().toISOString().split('T')[0];
        inputFecha.value = hoy;
    }
    cargarNombreUsuario();

    // 4. EVENTOS DE BÚSQUEDA Y SUGERENCIAS

// --- REEMPLAZA TU SECCIÓN DE EVENTOS DE BÚSQUEDA CON ESTO ---

// A. MIENTRAS ESCRIBE: Buscar sugerencias
if (inputDescripcion && datalistSugerencias) {
    let timer;
    inputDescripcion.addEventListener('input', () => {
        clearTimeout(timer);
        const query = inputDescripcion.value.trim();
        
        if (query.length >= 2) {
            timer = setTimeout(async () => {
                try {
                    // Usamos la ruta /api/buscar que ya tienes en tu server.js
                    const res = await fetch(`/api/buscar?termino=${encodeURIComponent(query)}`);
                    const productos = await res.json();

                    datalistSugerencias.innerHTML = '';
                    
                    productos.forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item.descripcion;
                        // Guardamos los datos ocultos en la opción
                        opt.dataset.barras = item.codigo_de_barras || '';
                        opt.dataset.codigo = item.codigo || '';
                        opt.dataset.precio = item.precio || '';
                        opt.dataset.pasillo = item.pasillo || '';
                        datalistSugerencias.appendChild(opt);
                    });
                } catch (e) { console.error("Error en sugerencias:", e); }
            }, 300);
        }
    });

    // B. AL SELECCIONAR: Auto-rellenar los campos
    inputDescripcion.addEventListener('change', () => {
        const valorSeleccionado = inputDescripcion.value;
        const opciones = datalistSugerencias.querySelectorAll('option');
        
        opciones.forEach(opt => {
            if (opt.value === valorSeleccionado) {
                // CORRECCIÓN: Los nombres deben coincidir con lo que pusiste en el .forEach de arriba
                inputBarcode.value = opt.dataset.barras || ''; // Antes decía codigo_de_barras
                inputCodigo.value = opt.dataset.codigo || '';
                inputPrecio.value = opt.dataset.precio || '';
                inputPasillo.value = opt.dataset.pasillo || '';
                
                if (inputCantidad) inputCantidad.focus();
            }
        });
    });
}

// C. BÚSQUEDA POR CÓDIGO DE BARRAS (Para escáner)
if (inputBarcode) {
    inputBarcode.addEventListener('change', async () => {
        const barcode = inputBarcode.value.trim();
        if (barcode.length < 1) return;

        try {
            const res = await fetch(`/api/buscar?termino=${encodeURIComponent(barcode)}`);
            const productos = await res.json();
            
            if (productos.length > 0) {
                // Si el escáner lo encuentra, usamos la función que ya tenías
                fillFormFields(productos[0]);
            }
        } catch (e) { console.error("Error buscando por barras:", e); }
    });
}
// Evento para rellenar los campos al seleccionar


    // 6. ATAJOS DE TECLADO (Enter y Escape)
    if (inputPasillo) {
        inputPasillo.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (btnGuardar) btnGuardar.click();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (formIngresoProductos) {
                formIngresoProductos.reset();
                if (datalistSugerencias) datalistSugerencias.innerHTML = '';
                if (inputBarcode) inputBarcode.focus();
                console.log("Formulario limpiado con Esc.");
            }
        }
    });

    formIngresoProductos.addEventListener('submit', async (e) => {
    e.preventDefault();

    // RECOLECCIÓN REAL DE DATOS
    const formData = {
        codigo_de_barras: inputBarcode.value.trim(),
        codigo: inputCodigo.value.trim(),
        descripcion: inputDescripcion.value.trim(),
        cantidad: inputCantidad.value.trim(),
        precio: inputPrecio.value.trim(),
        pasillo: inputPasillo.value.trim(),
        fecha: inputFecha.value
    };

    // VALIDACIÓN SIMPLE
    if (!formData.descripcion || !formData.cantidad) {
        showToast("⚠️ Por favor rellena Descripción y Cantidad."); // Cambiado alert por showToast
        return;
    }

    try {
        const res = await fetch('/api/guardar-producto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await res.json(); // <-- Aquí se define 'result'

        if (result.success) {
    //if (sonidoExito) sonidoExito.play();//
    showToast("✅ " + (result.message || "Producto guardado"));
    
    // Llamamos a tu función para que el número se actualice desde el servidor
    actualizarContadorIngresos(); 
    
    formIngresoProductos.reset();
            
            // RESTABLECER FECHA Y FOCO
            const hoy = new Date().toISOString().split('T')[0];
            inputFecha.value = hoy;
            if (datalistSugerencias) datalistSugerencias.innerHTML = '';
            inputBarcode.focus();

            // REFRESCAR TABLA AUTOMÁTICAMENTE
            if (typeof obtenerProductos === 'function') {
                obtenerProductos();
            } // <-- Faltaba esta llave

        } else {
            if (sonidoError) sonidoError.play();
            showToast("❌ Error: " + result.message);
        } // <-- Faltaba esta llave

    } catch (error) {
        console.error("Error al guardar:", error);
        showToast("❌ Error de conexión con el servidor.");
    }
});
    
    async function obtenerProductos() {
    try {
        // Pedimos los últimos 10 productos (ajusta la ruta si es necesario)
        const res = await fetch('/api/productos/filtrar?pagina=1&limite=10');
        const data = await res.json();
        
        // Buscamos el cuerpo de la tabla en tu HTML
        const tablaBody = document.querySelector('#tabla-productos tbody'); 
        if (!tablaBody || !data.productos) return;

        // Limpiamos la tabla antes de llenarla
        tablaBody.innerHTML = '';

        data.productos.forEach(item => {
            const tr = document.createElement('tr');
            // Usamos los nombres de columnas que vienen de tu base de datos
            tr.innerHTML = `
                <td>${item.codigo_de_barras || '-'}</td>
                <td>${item.codigo || '-'}</td>
                <td>${item.descripcion || 'Sin nombre'}</td>
                <td><span class="badge badge-info">${item.cantidad || 0}</span></td>
                <td>${item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A'}</td>
                <td>$${item.precio || '0.00'}</td>
                <td>${item.pasillo || '-'}</td>
                <td>
                    <button class="btn-historial" onclick="verHistorial('${item.codigo_de_barras}')">
                        🕒
                    </button>
                </td>
            `;
            tablaBody.appendChild(tr);
        });
        
        console.log("Tabla de inventario actualizada automáticamente.");
    } catch (e) {
        console.error("Error al refrescar la tabla:", e);
    }
}
    // 7. BOTÓN LIMPIAR MANUAL
    if (btnLimpiar && formIngresoProductos) {
        btnLimpiar.addEventListener('click', () => {
            formIngresoProductos.reset();
            if (datalistSugerencias) datalistSugerencias.innerHTML = '';
            if (inputBarcode) inputBarcode.focus();
        });
    }


    // --- FUNCIONES INTERNAS (Auxiliares) ---
    function fillFormFields(product) {
        if (!product) return;
        inputBarcode.value = product.codigo_de_barras || '';
        inputCodigo.value = product.codigo || '';
        inputDescripcion.value = product.descripcion || '';
        inputPrecio.value = product.precio || '';
        inputPasillo.value = product.pasillo || '';
        inputCantidad.focus(); 
    }

}); // <--- AQUÍ TERMINA EL DOMContentLoaded

// --- FUNCIONES GLOBALES (Fuera del DOM si se llaman desde otros sitios) ---
async function cargarNombreUsuario() {
    const display = document.getElementById('nombre-usuario-display');
    try {
        const response = await fetch('/api/usuario-actual');
        const data = await response.json();
        if (data.loggedIn && display) {
            display.textContent = `Hola: ${data.nombre_usuario}`;
        }
    } catch (e) { console.error("Error sesión:", e); }
}

function abrirModalAprobaciones() {
    const modal = document.getElementById('modal-aprobaciones');
    if (modal) {
        modal.style.display = 'flex';
        cargarEmpleadosPendientes(); // Llamamos a la carga de datos
    }
}

function cerrarModal() {
    document.getElementById('modal-aprobaciones').style.display = 'none';
}
function mostrarNotificacion(mensaje, tipo = 'exito') {
    const toast = document.createElement('div');
    toast.className = tipo === 'exito' ? 'toast-notificacion' : 'toast-notificacion toast-error';
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Obtenemos la ruta actual (ej: /registros o /ingreso-productos)
    const currentPath = window.location.pathname;
    
    // Buscamos todos los enlaces de la barra de navegación
    const navLinks = document.querySelectorAll('.nav-item');
    
    navLinks.forEach(link => {
        // Si el href del enlace coincide con la ruta actual, le ponemos la clase active
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});

function showToast(mensaje, tipo = 'success') {
    // Crear contenedor si no existe
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // Crear el toast
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    const icono = tipo === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span>${icono}</span> <span>${mensaje}</span>`;

    container.appendChild(toast);

    // Eliminarlo del DOM después de 3 segundos
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
     // Función para actualizar visualmente el contador
async function actualizarContadorIngresos() {
    const spanContador = document.getElementById('contador-ingresos');
    if (!spanContador) return;

    try {
        const response = await fetch('/api/ingresos-hoy');
        const data = await response.json();
        
        // Animación simple: si el número es > 0, resaltarlo en verde
        spanContador.textContent = data.total;
        spanContador.style.color = data.total > 0 ? '#28a745' : '#888';
        spanContador.style.fontWeight = 'bold';
    } catch (error) {
        console.error("Error al actualizar contador:", error);
    }
}

// Ejecutar al cargar la web
document.addEventListener('DOMContentLoaded', actualizarContadorIngresos);
// --- AL FINAL DEL ARCHIVO (FUERA DE TODO) ---
function configurarMenuSegunPlan(plan) {
    const btnAverias = document.getElementById('btn-reportar-averia');
    const btnHistorial = document.getElementById('btn-ingresos-realizados');
    const btnFacturacion = document.getElementById('btn-importar');

    // Comparamos con los nombres exactos de tu SELECT
    if (plan === 'Básico (Solo Inventario)') {
        if (btnAverias) btnAverias.style.display = 'none';
        if (btnHistorial) btnHistorial.style.display = 'none';
        if (btnFacturacion) btnFacturacion.style.display = 'none';
    } 
    else if (plan === 'Estándar (Inventario + Averías)') {
        if (btnFacturacion) btnFacturacion.style.display = 'none';
    }
}

async function actualizarBurbujaPendientes() {
    try {
        // USAMOS LA RUTA QUE SÍ EXISTE EN TU SERVER
        const sessionRes = await fetch('/api/usuario-actual'); 
        
        // Si la respuesta no es OK (ej: 404), nos salimos INMEDIATAMENTE
        if (!sessionRes.ok) return; 

        const user = await sessionRes.json();

        // Si no es admin, ocultamos el icono y salimos
        const contenedor = document.querySelector('.notificacion-contenedor');
        if (user.role !== 'admin') {
            if (contenedor) contenedor.style.display = 'none';
            return;
        }

        // Si llegamos aquí, es admin. Pedimos los empleados pendientes
        const res = await fetch('/api/empleados-pendientes');
        if (!res.ok) return;

        const data = await res.json();
        const pendientes = data.empleados || [];
        
        const burbuja = document.getElementById('contador-badge');
        
        if (pendientes.length > 0) {
            if (burbuja) {
                burbuja.textContent = pendientes.length;
                burbuja.style.display = 'block';
            }
            if (contenedor) contenedor.style.display = 'flex';
        } else {
            if (burbuja) burbuja.style.display = 'none';
        }
    } catch (e) {
        // Si hay error, no escribimos nada en el HTML, solo en la consola
        console.error("Error silencioso:", e);
    }
}

// Función para abrir el modal y cargar la lista


async function cargarListaModal() {
    const tabla = document.getElementById('lista-pendientes-modal');
    try {
        const res = await fetch('/api/empleados-pendientes');
        const pendientes = await res.json();
        
        if (pendientes.length === 0) {
            tabla.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay solicitudes</td></tr>';
            return;
        }

        // Añadimos el botón de Rechazar (Eliminar)
        tabla.innerHTML = pendientes
          .map(
            (p) => `
            <tr>
                <td>${p.nombre_usuario}</td>
                <td>${p.id_personal}</td>
                <td style="display: flex; gap: 5px;">
                    <button class="btn-aprobar" onclick="ejecutarAprobacion(${p.id})">✔</button>
                    <button class="btn-rechazar" onclick="ejecutarRechazo(${p.id})" title="Rechazar">✖</button>
                </td>
            </tr>
        `,
          )
          .join("");
    } catch (e) { console.error(e); }
}

// Nueva función para eliminar al usuario que no quieres en tu empresa

async function ejecutarAprobacion(id) {
    const confirmacion = await Swal.fire({
        title: '¿Aprobar usuario?',
        text: "El usuario podrá acceder al sistema.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, aprobar',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        try {
            const res = await fetch(`/api/aprobar-usuario/${id}`, { method: 'PUT' });
            const data = await res.json();

            if (data.success) {
                Swal.fire('¡Aprobado!', 'El usuario ha sido activado.', 'success');
                cargarListaModal(); // Refresca la tabla automáticamente
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            console.error("Error al aprobar:", error);
        }
    }
}

async function ejecutarRechazo(id) {
    const confirmacion = await Swal.fire({
        title: '¿Rechazar empleado?',
        text: "Esta acción eliminará al usuario permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        try {
            // USAMOS TU FETCH AQUÍ:
            const res = await fetch('/api/rechazar-empleado', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id: id }) // Enviamos el ID como pedía tu código
            });

            const data = await res.json();

            if (data.success) {
                Swal.fire('Eliminado', 'El usuario ha sido rechazado.', 'success');
                cargarListaModal(); // Volvemos a cargar la tabla para que desaparezca el usuario
            } else {
                Swal.fire('Error', data.message || 'No se pudo eliminar', 'error');
            }
        } catch (error) {
            console.error("Error en el fetch:", error);
            Swal.fire('Error', 'Hubo un fallo en la conexión con el servidor.', 'error');
        }
    }
}
// Ejemplo rápido del fetch en tu script de cliente:

async function cargarEmpleadosPendientes() {
    try {
        const response = await fetch('/api/empleados-pendientes');
        const pendientes = await response.json();

        const tablaCuerpo = document.getElementById('lista-pendientes-modal');
        
        // Si no existe la tabla en esta página, salimos de la función sin dar error
        if (!tablaCuerpo) return;

        tablaCuerpo.innerHTML = ""; // Limpiamos

        if (pendientes.length === 0) {
            tablaCuerpo.innerHTML = "<tr><td colspan='4' style='text-align:center;'>No hay solicitudes pendientes.</td></tr>";
            return;
        }

        pendientes.forEach(emp => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${emp.nombre_usuario}</td>
                <td>${emp.id_personal}</td>
                <td>${emp.email}</td>
                <td>
                    <button class="btn-aprobar" onclick="procesarSolicitud(${emp.id}, 'aprobar')">✔</button>
                    <button class="btn-rechazar" onclick="procesarSolicitud(${emp.id}, 'rechazar')">✖</button>
                </td>
            `;
            tablaCuerpo.appendChild(fila);
        });
    } catch (error) {
        console.error("Error al cargar pendientes:", error);
    }
}

async function procesarSolicitud(usuario_id, accion) {
    const url = accion === 'aprobar' ? '/api/aprobar-empleado' : '/api/rechazar-empleado';
    const metodo = accion === 'aprobar' ? 'POST' : 'DELETE';

    const confirmacion = await Swal.fire({
        title: `¿Estás seguro de ${accion} a este usuario?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        try {
            const response = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id })
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire('Completado', result.message, 'success');
                cargarEmpleadosPendientes(); // Recargar la tabla automáticamente
            } else {
                Swal.fire('Error', result.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo comunicar con el servidor', 'error');
        }
    }
}
async function verificarUsuarioYPermisos() {
    try {
        const res = await fetch('/api/usuario-actual'); // Usamos la ruta que tú tienes
        const data = await res.json();

        if (data.loggedIn) {
            // Guardamos el rol para usarlo después
            const usuarioRol = data.role; 

            // BUSCAMOS EL ICONO DE APROBACIONES
            const iconoAprobaciones = document.querySelector('.notificacion-contenedor');
            
            if (iconoAprobaciones) {
                if (usuarioRol === 'admin') {
                    iconoAprobaciones.style.display = 'flex'; // Mostrar si es admin
                } else {
                    iconoAprobaciones.style.display = 'none'; // OCULTAR si es empleado
                }
            }
        }
    } catch (e) {
        console.error("Error verificando permisos:", e);
    }
}

// Llamamos a la función al cargar la página
document.addEventListener('DOMContentLoaded', verificarUsuarioYPermisos);
// Ejecutar al cargar y cada 2 minutos para no saturar el servidor
actualizarBurbujaPendientes();
setInterval(actualizarBurbujaPendientes, 120000);
// Ejecución al cargar
window.addEventListener('DOMContentLoaded', () => {
    actualizarIdentidadUsuario();
    const planGuardado = localStorage.getItem('plan_usuario');
    if (planGuardado) configurarMenuSegunPlan(planGuardado);
});
function actualizarIdentidadUsuario() {
    const userName = localStorage.getItem('nombreUsuario') || 'Usuario';
    const userRole = localStorage.getItem('userRole') || 'Sin Rol';
    
    const elementoNombre = document.getElementById('user-name-display');
    const elementoRol = document.getElementById('user-role-display');

    if (elementoNombre) elementoNombre.textContent = userName;
    if (elementoRol) elementoRol.textContent = userRole;
    
    console.log("Identidad de usuario actualizada en el panel.");
}
function aplicarPermisos(rolUsuario) {
    const elementosAdmin = document.querySelectorAll('.solo-admin');

    if (rolUsuario === 'empleado') {
        elementosAdmin.forEach(elemento => {
            elemento.style.display = 'none'; // Desaparecen por completo
        });
        console.log("Modo Empleado: Funciones administrativas ocultas.");
    }
}
// Exponer funciones al ámbito global para que el 'onclick' del HTML las vea
window.abrirModalAprobaciones = abrirModalAprobaciones;
window.cerrarModal = cerrarModal;
window.procesarSolicitud = procesarSolicitud;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar sesión y rol directamente del servidor (Más seguro)
    fetch('/api/usuario-actual')
        .then(res => {
            if (!res.ok) throw new Error("Sin sesión");
            return res.json();
        })
        .then(user => {
            // Guardamos el rol en una variable para usarlo abajo
            const esAdmin = user && user.role === 'admin';

            // 2. Controlar visibilidad de elementos admin-only
            const adminElements = document.querySelectorAll('.admin-only');
            
            if (esAdmin) {
                // Mostrar elementos para el jefe
                adminElements.forEach(el => {
                    el.style.display = 'flex'; // o 'block' según tu diseño
                });

                // Mostrar icono de notificaciones y cargar contador
                const divNotif = document.getElementById('contenedor-aprobaciones');
                if (divNotif) divNotif.style.display = 'flex';
                
                if (typeof actualizarContadorAprobaciones === 'function') {
                    actualizarContadorAprobaciones();
                }
            } else {
                // Si no es admin, eliminamos los elementos sensibles
                adminElements.forEach(el => el.remove());
            }
        })
        .catch(err => {
            if (err.message === "Sin sesión") {
                console.log("Acceso de invitado");
                // Opcional: Redirigir al login si es obligatorio estar logueado
                // window.location.href = '/login.html';
            } else {
                console.error("Error técnico:", err);
            }
        });
});