import { playSound } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
    const formReportarAveria = document.getElementById('form-reportar-averia');
    const inputCodigoDeBarrasAveria = document.getElementById('codigo_de_barras_averia');
    const inputDescripcionProductoAveria = document.getElementById('descripcion_producto_averia');
    const inputDescripcionAveria = document.getElementById('descripcion_averia');
    const inputFechaAveria = document.getElementById('fecha_averia');
    const selectEstadoAveria = document.getElementById('estado_averia');
    const btnLimpiarAveria = document.getElementById('btn-limpiar-averia');

    // Fecha actual por defecto
    function setTodayDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        inputFechaAveria.value = `${yyyy}-${mm}-${dd}`;
    }
    setTodayDate();

    // Autocompletar descripción al ingresar código de barras
    let typingTimerBarcode;
    inputCodigoDeBarrasAveria.addEventListener('input', () => {
        clearTimeout(typingTimerBarcode);
        const barcode = inputCodigoDeBarrasAveria.value.trim();
        if (barcode.length >= 3) {
            typingTimerBarcode = setTimeout(() => fetchProductDetails(barcode), 500);
        } else {
            inputDescripcionProductoAveria.value = '';
        }
    });

    inputCodigoDeBarrasAveria.addEventListener('change', () => {
        fetchProductDetails(inputCodigoDeBarrasAveria.value.trim());
    });

    async function fetchProductDetails(barcode) {
        if (!barcode) {
            inputDescripcionProductoAveria.value = '';
            return;
        }
        try {
            const response = await fetch(`/api/productos/barcode/${barcode}`);
            const result = await response.json();
            if (result.success && result.product) {
                inputDescripcionProductoAveria.value = result.product.descripcion || 'Sin descripción';
            } else {
                inputDescripcionProductoAveria.value = 'Producto no encontrado';
            }
        } catch (error) {
            console.error('Error:', error);
            inputDescripcionProductoAveria.value = 'Error al cargar';
        }
    }

    // Envío del formulario
    formReportarAveria.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            codigo_de_barras: inputCodigoDeBarrasAveria.value.trim(),
            descripcion_averia: inputDescripcionAveria.value.trim(),
            fecha_averia: inputFechaAveria.value,
            cantidad: 1,
            estado: selectEstadoAveria.value
        };

        if (!data.codigo_de_barras || data.codigo_de_barras === 'undefined') {
            playSound('error');
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
                playSound('success');
                showToast("Avería reportada con éxito", "success");
                formReportarAveria.reset();
                setTodayDate();
                inputDescripcionProductoAveria.value = '';
            } else {
                playSound('error');
                showToast('Error: ' + result.message, "error");
            }
        } catch (error) {
            console.error('Error:', error);
            playSound('error');
            showToast('Error de conexión con el servidor', "error");
        }
    });

    // Botón limpiar
    if (btnLimpiarAveria) {
        btnLimpiarAveria.addEventListener('click', () => {
            formReportarAveria.reset();
            setTodayDate();
            inputDescripcionProductoAveria.value = '';
        });
    }

    cargarNombreUsuario();
});

async function cargarNombreUsuario() {
    const display = document.getElementById('nombre-usuario-display');
    const rolDisplay = document.getElementById('user-role-display');
    try {
        const response = await fetch('/api/usuario-actual');
        const data = await response.json();
        if (data.loggedIn && display) {
            display.textContent = data.nombre_usuario;
            if (rolDisplay) rolDisplay.textContent = data.role === 'admin' ? 'Administrador' : 'Usuario';
            localStorage.setItem('userRole', data.role);
        }
    } catch (e) {
        console.error("Error sesión:", e);
    }
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `
        <i class="fa-solid ${icon} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.showToast = showToast;
