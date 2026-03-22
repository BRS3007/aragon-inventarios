// Variable global para controlar la paginación
let paginaActual = 1;
const limite = 50; // <--- AGREGA ESTA LÍNEA (define cuántos productos ver por página)

// registros.js - Versión Única y Corregida
document.addEventListener('DOMContentLoaded', () => {
    cargarNombreUsuario();
    fetchAndDisplayProducts(1)
    cargarDatosHeader();

    const nombreUsuarioElemento = document.getElementById('nombreUsuario'); // El ID de tu span/h3


    async function cargarNombreUsuario() {
    try {
        const response = await fetch('/api/usuario-actual');
        const data = await response.json();

        if (data.loggedIn) {
            // Busca un elemento con ID 'nombreUsuarioDisplay' o similar en tu HTML
            const display = document.getElementById('nombre-usuario-display');
            if (display) {
                display.textContent = `Hola: ${data.nombre_usuario}`;
            }
        } else {
            // Si intentan entrar sin sesión, los mandamos al login
            window.location.href = '/';
        }
    } catch (error) {
        console.error("Error al obtener usuario:", error);
    }
}

    // 2. Configuración de Búsqueda con Debounce
    const inputBuscar = document.getElementById('search-input');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', () => {
            const term = inputBuscar.value.trim();
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(() => {
                if (term.length >= 2) buscarEnServidor(term);
                else if (term.length === 0) fetchAndDisplayProducts(1);
            }, 300);
        });
    }

    // 3. Botón Limpiar Búsqueda
    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (inputBuscar) inputBuscar.value = '';
            paginaActual = 1;
            
        });
    }

    // 4. Botón Filtrar por Fechas
    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            const inicio = document.getElementById('fecha-inicio').value;
            const fin = document.getElementById('fecha-fin').value;
            if (!inicio || !fin) {
                alert("Por favor, selecciona ambas fechas.");
                return;
            }
            cargarProductosFiltrados(inicio, fin);
        });
    }

    // 5. Botón Limpiar Filtros (Papelera)
    const btnLimpiarFiltro = document.getElementById('clear-filter-btn');
    if (btnLimpiarFiltro) {
        btnLimpiarFiltro.addEventListener('click', () => {
            document.getElementById('fecha-inicio').value = '';
            document.getElementById('fecha-fin').value = '';
            paginaActual = 1;
            fetchAndDisplayProducts(1);
        });
    }

    // 6. Botón Exportar Excel
    const btnExportar = document.getElementById('export-excel-btn'); // El ID de tu <a> o <button>

if (btnExportar) {
    btnExportar.addEventListener('click', (e) => {
        e.preventDefault(); // Evita que la página recargue
        
        const inicio = document.getElementById('fecha-inicio')?.value;
        const fin = document.getElementById('fecha-fin')?.value;

        if (!inicio || !fin) {
            Swal.fire('Atención', 'Selecciona un rango de fechas para exportar', 'warning');
            return;
        }

        // Redirige a la URL para iniciar la descarga automática del navegador
        window.location.href = `/api/exportar?fechaInicio=${inicio}&fechaFin=${fin}`;
    });
}
});


// Estos datos te los dará el administrador de Revel
const REVEL_CONFIG = {
    apiKey: 'TU_API_KEY_AQUÍ',
    apiSecret: 'TU_API_SECRET_AQUÍ',
    baseUrl: 'https://tu_empresa.revelup.com' // Tu subdominio de Revel
};

async function sincronizarVentasRevel(empresa_id) { // Pasamos el ID de la empresa por parámetro
    try {
        console.log("Consultando ventas recientes en Revel POS...");

        const response = await axios.get(`${REVEL_CONFIG.baseUrl}/resources/Order/`, {
            headers: {
                'API-Key': REVEL_CONFIG.apiKey,
                'API-Secret': REVEL_CONFIG.apiSecret,
                'Content-Type': 'application/json'
            },
            params: { is_complete: true, limit: 10 }
        });

        const ventas = response.data.objects;

        for (let venta of ventas) {
            for (let item of venta.orderitems) {
                
                // Usamos la tabla 'inventario' como diario de movimientos
                const query = `
                    INSERT INTO inventario 
                    (codigo_de_barras, codigo, descripcion, cantidad, fecha, precio, pasillo, id_personal_usuario, empresa_id) 
                    VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)`;

                // Usamos 'db.query' directamente ya que configuramos el pool con promesas
                await db.query(query, [
                    item.product_barcode || 'S/N', 
                    item.product_id, 
                    `VENTA REVEL: ${item.product_name}`, 
                    -(item.quantity), // Resta stock
                    item.price,
                    'TIENDA', 
                    'SISTEMA_REVEL',
                    empresa_id // Filtro de seguridad por empresa
                ]);
            }
        }
        console.log("Sincronización completada.");
    } catch (error) {
        console.error("Error en Revel:", error.message);
    }
}
// --- FUNCIONES DE CARGA Y RENDERIZADO ---

// registros.js

// Esperar a que el HTML cargue para asignar el evento
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    
    // Escuchar cuando el usuario escribe
    searchInput.addEventListener('input', () => {
        buscarEnServidor();
    });
});

function buscarEnServidor() {
    const input = document.getElementById('search-input');
    const termino = input ? input.value : '';
    const cuerpoTabla = document.getElementById('cuerpo-tabla-principal');
    const mensajeVacio = document.getElementById('no-products-message');

    fetch(`/api/buscar?termino=${encodeURIComponent(termino)}`)
        .then(response => response.json())
        .then(data => {
            let html = "";
            
            if (data.length === 0) {
                if (mensajeVacio) mensajeVacio.style.display = 'block';
                cuerpoTabla.innerHTML = "";
            } else {
                if (mensajeVacio) mensajeVacio.style.display = 'none';
                data.forEach(item => {
                    // Formateo de fecha para que coincida con tu diseño
                    const fecha = new Date(item.fecha).toLocaleDateString();
                    
                    html += `
                        <tr>
                            <td>${item.codigo_de_barras}</td>
                            <td>${item.codigo}</td>
                            <td>${item.descripcion}</td>
                            <td>${item.cantidad}</td>
                            <td>${fecha}</td>
                            <td>$${item.precio}</td>
                            <td>${item.pasillo}</td>
                            <td>
                                <button onclick="verHistorial(${item.id})" title="Ver Historial">
                                    <i class="fa-solid fa-clock-rotate-left"></i>
                                </button>
                            </td>
                        </tr>`;
                });
                cuerpoTabla.innerHTML = html;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            cuerpoTabla.innerHTML = '<tr><td colspan="8">Error de conexión</td></tr>';
        });
}
function mostrarResultados(datos) {
    let contenedor = document.getElementById('resultados');
    contenedor.innerHTML = ''; // Limpiar resultados anteriores

    if (datos.length === 0) {
        contenedor.innerHTML = 'No se encontraron registros.';
        return;
    }

    // Ejemplo: Crear una lista con los resultados
    datos.forEach(item => {
        contenedor.innerHTML += `<p>Resultado: ${item.nombre_columna}</p>`;
    });
}

async function cargarDatosHeader() {
    try {
        const res = await fetch('/api/usuario-actual');
        const data = await res.json();
        if (data.nombre) {
            const displayEmpresa = document.getElementById('display-empresa');
            const displayDueno = document.getElementById('display-dueno');
            if (displayEmpresa) displayEmpresa.textContent = data.empresa;
            if (displayDueno) displayDueno.textContent = `Hola: ${data.nombre}`;
        }
    } catch (e) { console.error("Error al cargar header:", e); }
}

let cargando = false;

async function fetchAndDisplayProducts(pagina = 1) {
    if (cargando) return; // Si ya está cargando, no hace nada
    cargando = true;

    const tabla = document.getElementById('productos-table');
    let tbody = tabla ? tabla.querySelector('tbody') : null;
    
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Cargando inventario...</td></tr>';
    }

    try {
        const response = await fetch(`/api/productos/filtrar?page=${pagina}`);
        const data = await response.json();

        // Si el servidor devolvió un error (como el 500 que vimos antes), lo manejamos
        if (data.error) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="8">Error: ${data.error}</td></tr>`;
            return;
        }

        const productosParaRenderizar = data.productos || (Array.isArray(data) ? data : []);
        renderTable(productosParaRenderizar);

    } catch (error) {
        console.error("Error al obtener productos:", error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="8">Error de conexión con el servidor</td></tr>';
    } finally {
        cargando = false; // Liberamos para la siguiente petición
    }
}

async function abrirHistorial(codigoDeBarras) {
    const modal = document.getElementById('modal-historial');
    const tablaCuerpo = document.getElementById('cuerpo-historial');

    if (modal) modal.style.display = 'block';
    
    // Ajustamos el colspan a 6 (Fecha, Tipo, Cantidad, Precio, Pasillo, Usuario)
    if (tablaCuerpo) {
        tablaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando historial...</td></tr>';
    }

    try {
        const response = await fetch(`/api/historial/${codigoDeBarras}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            tablaCuerpo.innerHTML = ''; 
            
            result.data.forEach(reg => {
                const fila = document.createElement('tr');
                
                // Lógica para diferenciar Avería de Ingreso
                const esAveria = reg.tipo === 'Avería';
                const colorTipo = esAveria ? '#ff4d4d' : '#2ecc71'; // Rojo suave vs Verde
                const bgFila = esAveria ? 'rgba(255, 0, 0, 0.05)' : 'transparent'; // Fondo rosado muy tenue para averías
                
                fila.style.backgroundColor = bgFila;

                fila.innerHTML = `
                    <td>${new Date(reg.fecha).toLocaleDateString()}</td>
                    <td style="color: ${colorTipo}; font-weight: bold;">
                        ${esAveria ? '⚠️ ' : '📥 '}${reg.tipo}
                    </td>
                    <td style="text-align: center; font-weight: bold; color: ${colorTipo}">
                        ${esAveria ? '-' : '+'}${reg.cantidad}
                    </td>
                    <td>${reg.precio > 0 ? '$' + parseFloat(reg.precio).toFixed(2) : '—'}</td>
                    <td>${reg.pasillo || '—'}</td>
                    <td><strong>${reg.nombre_usuario || 'Sistema'}</strong></td>
                `;
                tablaCuerpo.appendChild(fila);
            });
        } else {
            tablaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay registros previos para este producto.</td></tr>';
        }
    } catch (error) {
        console.error("Error al cargar historial:", error);
        if (tablaCuerpo) {
            tablaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al conectar con el servidor.</td></tr>';
        }
    }
}

window.abrirHistorial = abrirHistorial;

function renderTable(productos) {
    // Buscamos el cuerpo de la tabla 'productos-table'
    const tabla = document.getElementById('productos-table');
    if (!tabla) return;
    
    let tbody = tabla.querySelector('tbody');
    if (!tbody) {
        tbody = document.createElement('tbody');
        tabla.appendChild(tbody);
    }


    // Validación crítica: Si 'productos' no es una lista, lo convertimos en una vacía
    if (!Array.isArray(productos)) {
        console.error("Los datos recibidos no son un array:", productos);
        tbody.innerHTML = '<tr><td colspan="8">Error en el formato de datos del servidor</td></tr>';
        return;
    }

    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No se encontraron productos</td></tr>';
        return;
    }

    tbody.innerHTML = productos.map(p => `
    <tr>
        <td>${p.codigo_de_barras || '---'}</td> 
        <td><strong>${p.codigo}</strong></td>
        <td>${p.descripcion}</td>
        <td style="text-align:center; font-weight:bold;">${p.cantidad || 0}</td>
        <td>${p.fecha ? new Date(p.fecha).toLocaleDateString() : 'N/A'}</td>
        <td>$${parseFloat(p.precio || 0).toFixed(2)}</td>
        <td>${p.pasillo || '-'}</td>
        <td>
            <button class="btn-history" onclick="abrirHistorial('${p.codigo_de_barras}')">
                <i class="fas fa-history"></i>
            </button>
        </td>
    </tr>
`).join('');
}

async function cargarRegistros(pagina = 1) {
    paginaActual = pagina;
    const q = document.getElementById('search-input')?.value || '';
    const fechaInicio = document.getElementById('fecha-inicio')?.value || '';
    const fechaFin = document.getElementById('fecha-fin')?.value || '';

    try {
        const url = `/api/productos/filtrar?pagina=${paginaActual}&limite=${limite}&q=${q}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
        const res = await fetch(url);
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (typeof renderTable === 'function') {
            renderTable(data.productos);
        }
        
        const spanPagina = document.getElementById('n-pagina');
        if (spanPagina) spanPagina.innerText = paginaActual;

    } catch (error) {
        console.error("Error cargando registros:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnFiltrar = document.getElementById('filter-btn');
    const btnLimpiarTodo = document.getElementById('clear-filter-btn');
    const btnLimpiarTexto = document.getElementById('clear-search-btn');

    if (btnFiltrar) btnFiltrar.onclick = () => cargarRegistros(1);

    if (btnLimpiarTexto) {
        btnLimpiarTexto.onclick = () => {
            document.getElementById('search-input').value = '';
            cargarRegistros(1);
        };
    }

    if (btnLimpiarTodo) {
        btnLimpiarTodo.onclick = () => {
            document.getElementById('search-input').value = '';
            document.getElementById('fecha-inicio').value = '';
            document.getElementById('fecha-fin').value = '';
            cargarRegistros(1);
        };
    }

    cargarRegistros(1);
});

async function cargarProductosFiltrados() {
    // 1. CORRECCIÓN DE IDs: Usamos los que están en tu HTML
    const fechaInicio = document.getElementById('fecha-inicio')?.value || '';
    const fechaFin = document.getElementById('fecha-fin')?.value || '';
    const busqueda = document.getElementById('search-input')?.value || '';

    try {
        console.log(`Filtrando por: ${fechaInicio} hasta ${fechaFin} y texto: ${busqueda}`);

        // 2. Construimos la URL con los parámetros que espera tu server.js
        const url = `/api/productos/filtrar?q=${encodeURIComponent(busqueda)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
        
        const response = await fetch(url);
        
        if (!response.ok) throw new Error("Error en la respuesta del servidor");

        const data = await response.json();
        
        // 3. Renderizamos la tabla (asumiendo que actualizarTablaRegistros es tu función de dibujo)
        if (typeof renderTable === 'function') {
    renderTable(data.productos || data); 
    } else {
            console.error("La función renderTable no está definida");
        }

    } catch (error) {
        console.error("Error al filtrar productos:", error);
        if (typeof Swal !== 'undefined') {
            Swal.fire("Error", "No se pudieron cargar los datos", "error");
        }
    }
}



// Funciones globales para que los botones onclick funcionen
window.paginaAnterior = function() {
    if (paginaActual > 1) {
        paginaActual--;
        cargarRegistros(paginaActual);
    }
};

window.paginaSiguiente = function() {
    paginaActual++;
    cargarRegistros(paginaActual);
};


const clearBtn = document.getElementById('clear-search-btn');
clearBtn.addEventListener('click', async () => {
    // 1. Limpiar el valor del input
    searchInput.value = '';
    
    // 2. Enfocar el buscador por comodidad del usuario
    searchInput.focus();

    // 3. Volver a cargar la tabla original (sin filtros)
    try {
        const response = await fetch(`/api/productos/filtrar?page=1`);
        const data = await response.json();

        // Usamos las funciones que ya tienes para renderizar la tabla
        actualizarTablaHTML(data.productos);
        actualizarPaginacion(data.totalPaginas, 1);
    } catch (error) {
        console.error("Error al limpiar búsqueda:", error);
    }
});

window.verDetalles = async function(codigo) {
    console.log("¡Cargando historial nuevo para el código:", codigo); // Esto debe salir en la consola (F12)
    // ... resto del código ...
    const modal = document.getElementById('modal-historial');
    if (modal) modal.style.display = 'block';

    const tablaCuerpo = document.getElementById('cuerpo-historial');
    
    // Mostramos el mensaje de carga ocupando las 6 columnas del historial
    if (tablaCuerpo) {
        tablaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando historial...</td></tr>';
    }

    try {
        const response = await fetch(`/api/historial/${codigo}`);
        const result = await response.json();

        const historial = Array.isArray(result.data) ? result.data : [];

        if (historial.length > 0) {
            const filas = historial.map(reg => {
                // Lógica de diseño: Avería (Rojo/Resta) vs Ingreso (Verde/Suma)
                
                const esAveria = reg.tipo === 'Avería';
                const colorTexto = esAveria ? '#d9534f' : '#28a745'; 
                const icono = esAveria ? '⚠️' : '📥';
                
                // Esta es la parte clave:
                // Math.abs asegura que el número sea positivo, y luego concatenamos el signo.
                const cantidadLimpia = esAveria 
                ? `-${Math.abs(reg.cantidad)}` 
                : `+${Math.abs(reg.cantidad)}`;    
                // Fondo sutil para que la fila de avería resalte como algo diferente
                const estiloFila = esAveria ? 'style="background-color: rgba(217, 83, 79, 0.08);"' : '';

                return `
                    <tr ${estiloFila}>
                        <td>${new Date(reg.fecha).toLocaleDateString()}</td>
                        <td style="color: ${colorTexto}; font-weight: bold;">
                            ${icono} ${reg.tipo}
                        </td>
                        <td style="text-align: center; font-weight: bold; color: ${colorTexto};">
                        ${cantidadLimpia}
                        </td>
                        <td>${reg.precio > 0 ? '$' + parseFloat(reg.precio).toFixed(2) : '—'}</td>
                        <td>${reg.pasillo || 'N/A'}</td>
                        <td><strong>${reg.nombre_usuario || 'Sistema'}</strong></td>
                    </tr>
                `;
            }).join('');
            
            tablaCuerpo.innerHTML = filas;
        } else {
            tablaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align:center;">Este producto no tiene movimientos registrados.</td></tr>';
        }
    } catch (error) {
        console.error("Error visualizando detalles:", error);
        if (tablaCuerpo) {
            tablaCuerpo.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al conectar con el servidor.</td></tr>';
        }
    }
};

// Función única para cerrar el modal
window.cerrarModal = function() {
    const modal = document.getElementById('modal-historial');
    if (modal) modal.style.display = 'none';
};
window.cargarProductosFiltrados = cargarProductosFiltrados;

async function descargarHistorialPDF() {
    // 1. Verificamos si la librería html2pdf está cargada, si no, la cargamos dinámicamente
    if (typeof html2pdf === 'undefined') {
        console.log("Cargando librería PDF...");
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
    }

    // 2. Seleccionamos el contenido del modal (ajusta el selector si es necesario)
    const elemento = document.querySelector('.modal-content') || document.body;
    
    // 3. Configuraciones profesionales
    const opciones = {
        margin:       [15, 10, 15, 10],
        filename:     `Historial_Aragon_${new Date().toLocaleDateString()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 3, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Ocultar botones para que no salgan en el PDF
    const botonesParaOcultar = document.querySelectorAll('.btn, .btn-close');
    botonesParaOcultar.forEach(b => b.style.opacity = '0');

    // 4. Generar el PDF
    html2pdf().set(opciones).from(elemento).save().then(() => {
        // Volver a mostrar los botones
        botonesParaOcultar.forEach(b => b.style.opacity = '1');
    }).catch(err => {
        console.error("Error al generar PDF:", err);
        alert("Hubo un error al generar el PDF. Revisa la consola.");
    });
}
// Forzamos que la función sea global para que el 'onclick' la encuentre siempre
window.descargarHistorialPDF = async function() {
    console.log("Generando reporte PDF con encabezado...");

    // 1. Cargar librería si falta
    if (typeof html2pdf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
    }

    const elementoOriginal = document.querySelector('.modal-content');
    if (!elementoOriginal) return;

    // 2. Crear un contenedor temporal para no ensuciar tu pantalla
    const contenedorTemporal = document.createElement('div');
    contenedorTemporal.style.padding = '20px';
    contenedorTemporal.style.fontFamily = 'Arial, sans-serif';

    // 3. AGREGAR EL ENCABEZADO (Logo y Nombre)
    // Nota: Cambia 'URL_DE_TU_LOGO' por la ruta de tu imagen real
    contenedorTemporal.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #d32f2f; padding-bottom: 10px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="../imagenes/aragon-favicon.jpg" style="height: 80px;">
                </div>
                <div>
                    <h1 style="margin: 0; color: #d32f2f; font-size: 22px; text-transform: uppercase;">Aragon Smart Inventories</h1>
                    <p style="margin: 0; font-size: 12px; color: #666;">Reporte Oficial de Movimientos</p>
                </div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #444;">
                <strong>Fecha de reporte:</strong> ${new Date().toLocaleDateString()}<br>
                <strong>Generado por:</strong> Sistema de Gestión
            </div>
        </div>
    `;

    // 4. Clonar la tabla del historial y limpiarla de botones
    const clonTabla = elementoOriginal.cloneNode(true);
    const botones = clonTabla.querySelectorAll('button, .btn-close');
    botones.forEach(b => b.remove()); // Borramos los botones del clon para que no salgan en el PDF

    contenedorTemporal.appendChild(clonTabla);

    // 5. Configuración del PDF
    const opciones = {
        margin: [10, 10, 10, 10],
        filename: `Reporte_Aragon_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 6. Generar y descargar
    try {
        await html2pdf().set(opciones).from(contenedorTemporal).save();
    } catch (error) {
        console.error("Error PDF:", error);
    }
};
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