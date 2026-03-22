document.addEventListener('DOMContentLoaded', () => {
    console.log("averias.js: Script cargado y DOMContentLoaded.");

    const formReportarAveria = document.getElementById('form-reportar-averia');
    const inputCodigoDeBarrasAveria = document.getElementById('codigo_de_barras_averia');
    const inputDescripcionProductoAveria = document.getElementById('descripcion_producto_averia');
    const inputDescripcionAveria = document.getElementById('descripcion_averia');
    const inputFechaAveria = document.getElementById('fecha_averia');
    const selectEstadoAveria = document.getElementById('estado_averia');
    const btnLimpiarAveria = document.getElementById('btn-limpiar-averia');

    // --- Funciones Auxiliares ---

    // Funcion para rellenar la descripcion del producto basado en el codigo de barras
    async function fetchProductDetails(barcode) {
        if (!barcode) {
            inputDescripcionProductoAveria.value = '';
            return;
        }
        try {
            const response = await fetch(`/api/productos/barcode/${barcode}`);
            const result = await response.json();

            if (result.success && result.product) {
                inputDescripcionProductoAveria.value = result.product.descripcion || 'Producto sin descripción';
            } else {
                inputDescripcionProductoAveria.value = 'Producto no encontrado';
            }
        } catch (error) {
            console.error('Error al buscar detalles del producto por codigo de barras:', error);
            inputDescripcionProductoAveria.value = 'Error al cargar descripción';
        }
    }

    // Funcion para limpiar el formulario
    function clearAveriaForm() {
        formReportarAveria.reset();
        setTodayDate(); // Vuelve a establecer la fecha actual
        inputDescripcionProductoAveria.value = ''; // Asegurar que este campo se limpia
    }

    // Funcion para establecer la fecha actual por defecto
    function setTodayDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0
        const dd = String(today.getDate()).padStart(2, '0');
        inputFechaAveria.value = `${yyyy}-${mm}-${dd}`;
    }

    // --- Event Listeners ---

    // Establecer la fecha actual al cargar la pagina
    setTodayDate();

    // Autocompletado de descripcion de producto al ingresar codigo de barras
    let typingTimerBarcode;
    const doneTypingIntervalBarcode = 500; // 0.5 segundos

    inputCodigoDeBarrasAveria.addEventListener('input', () => {
        clearTimeout(typingTimerBarcode);
        const barcode = inputCodigoDeBarrasAveria.value.trim();
        if (barcode.length >= 3) { // Buscar despues de 3 caracteres
            typingTimerBarcode = setTimeout(() => fetchProductDetails(barcode), doneTypingIntervalBarcode);
        } else {
            inputDescripcionProductoAveria.value = ''; // Limpiar si el codigo es muy corto
        }
    });

    // Evento 'change' para asegurar la busqueda si el usuario pega un codigo o sale del campo
    inputCodigoDeBarrasAveria.addEventListener('change', () => {
        const barcode = inputCodigoDeBarrasAveria.value.trim();
        fetchProductDetails(barcode);
    });


    // Manejar el envio del formulario de averia
    if (formReportarAveria) {
        formReportarAveria.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        codigo_de_barras: inputCodigoDeBarrasAveria.value.trim(),
    descripcion_averia: inputDescripcionAveria.value.trim(), // Esto es el 'motivo'
    fecha_averia: inputFechaAveria.value, // Esto es la 'fecha'
    cantidad: 1, // ¿Cuántos se dañaron? Agrégalo si no lo tienes
    estado: selectEstadoAveria.value
    };

    // Validación rápida para evitar el "undefined"
    if (data.codigo_de_barras === "" || data.codigo_de_barras === "undefined") {
        showToast("Código de barras no válido", "error");
        return;
    }

    try {
        const response = await fetch('/api/guardar-averia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast("Avería reportada con éxito"); // Usando Toast
            clearAveriaForm();
        } else {
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión con el servidor', 'error');
    }
});
    }

    // Boton para limpiar el formulario
    if (btnLimpiarAveria) {
        btnLimpiarAveria.addEventListener('click', clearAveriaForm);
    }

}); // Cierre del DOMContentLoaded

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

function showToast(message, type = 'success') {
    // Si usas una librería como Toastify, aquí iría su configuración.
    // Si no, este es un reemplazo elegante:
    const toast = document.createElement('div');
    toast.className = `toast-notificacion ${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.padding = '15px';
    toast.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
    toast.style.color = 'white';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '1000';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
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
document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtenemos el rol desde la sesión o localStorage
    // Al hacer login deberías haber guardado: localStorage.setItem('rol', data.rol);
    const userRole = localStorage.getItem('userRole'); 

    // 2. Seleccionamos los elementos que solo son para el jefe
    const adminElements = document.querySelectorAll('.admin-only');

    if (userRole === 'admin') {
        // Si es admin, nos aseguramos de que se vean
        adminElements.forEach(el => {
            el.style.display = 'block'; 
        });
    } else {
        // Si es empleado (o cualquier otro), los eliminamos por completo
        adminElements.forEach(el => {
            el.remove(); 
        });
    }
});
// Ejecutar cuando cargue la página
document.addEventListener('DOMContentLoaded', cargarNombreUsuario);

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