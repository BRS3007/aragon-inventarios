document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = '/api/subir-excel'; 
    const uploadForm = document.getElementById('upload-form');
    const excelFile = document.getElementById('excel-file');
    const statusMessage = document.getElementById('status-message');
cargarNombreUsuario();


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
    if (!uploadForm || !excelFile || !statusMessage) return;


uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Evita que la página se recargue
    
    const file = excelFile.files[0];
    if (!file) {
        alert("Por favor, selecciona un archivo.");
        return;
    }

    console.log("🚀 Iniciando subida para:", file.name);

    const formData = new FormData();
    formData.append('excelFile', file); // 'excelFile' debe ser igual en upload.single('excelFile')

    try {
        const response = await fetch('/api/subir-excel', {
            method: 'POST',
            body: formData // El navegador configura el Content-Type automáticamente
        });

        const result = await response.json();
        
        if (result.success) {
            console.log("✅ Servidor dice:", result.message);
            alert("¡Éxito! " + result.message);
        } else {
            console.error("❌ Error del servidor:", result.message);
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("❌ Error de red/conexión:", error);
        alert("No se pudo conectar con el servidor.");
    }
});

    // En tu script del frontend (donde manejas el botón "Procesar y Subir")
async function subirArchivo() {
    const fileInput = document.getElementById('tu-input-file');
    const formData = new FormData();
    formData.append('excel', fileInput.files[0]);

    const response = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData
        // No enviamos el nombre de la empresa aquí, 
        // el servidor lo sacará de req.session.empresa
    });
    
    const resultado = await response.json();
    document.getElementById('resultado').innerText = resultado.message;
}

    function setStatusMessage(text, color) {
        statusMessage.textContent = text;
        statusMessage.style.color = color;
    }
});
function mostrarProgresoReal() {
    const modal = document.getElementById('modal-carga-masiva');
    const barra = document.getElementById('barra-fill');
    const txtPorcentaje = document.getElementById('porcentaje-label');
    const txtConteo = document.getElementById('conteo-detallado');

    modal.style.display = 'flex';

    const monitor = setInterval(async () => {
        try {
            const res = await fetch('/api/status-carga');
            const status = await res.json();

            if (status.total > 0) {
                const pct = Math.round((status.procesados / status.total) * 100);
                
                // Actualizamos visualmente
                barra.style.width = `${pct}%`;
                txtPorcentaje.innerText = `${pct}%`;
                txtConteo.innerText = `${status.procesados.toLocaleString()} / ${status.total.toLocaleString()}`;

                if (status.estado === 'finalizado') {
                    clearInterval(monitor);
                    document.getElementById('msg-estado').innerText = "⭐ ¡Carga Completa!";
                    setTimeout(() => {
                        modal.style.display = 'none';
                        location.reload(); // Refresca para ver los cambios
                    }, 2000);
                }
            }
        } catch (err) {
            console.error("Error al obtener progreso:", err);
        }
    }, 800);
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