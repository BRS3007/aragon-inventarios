import Swal from 'sweetalert2';
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERENCIAS AL DOM ---
    const btnMoverALogin = document.getElementById("btn__iniciar-Sesion"); // Botón de la caja trasera
    const btnMoverARegistro = document.getElementById("btn__registrarse"); // Botón de la caja trasera

    const contenedor_login_register = document.querySelector(".contenedor__login-register");
    const formulario_login = document.querySelector(".formulario__login");
    const formulario_register = document.querySelector(".formulario__register");
    const caja_trasera_login = document.querySelector(".caja__trasera-login");
    const caja_trasera_register = document.querySelector(".caja__trasera-register");

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // --- 2. FUNCIONES DE CONEXIÓN AL SERVIDOR (BACKEND) ---

    async function ejecutarLogin(event) {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                localStorage.setItem('plan_usuario', result.plan);
                localStorage.setItem('userRole', result.rol);

                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido!',
                    text: 'Ingresando al sistema...',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = '/ingreso-productos';
                });
            } else {
                let icono = result.message.includes('confirmar') ? 'warning' : 'error';
                Swal.fire({ icon: icono, title: 'Atención', text: result.message });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
        }
    }

    async function ejecutarRegistro(event) {
        event.preventDefault();
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        Swal.fire({
            title: 'Procesando...',
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire('¡Éxito!', 'Verifica tu correo para activar tu cuenta.', 'success');
                registerForm.reset();
                mostrarLogin(); // Regresamos al login automáticamente
            } else {
                Swal.fire('Error', result.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    }

    // --- 3. FUNCIONES DE DISEÑO (MOVIMIENTO DE CAJAS) ---

    function anchoPagina() {
        if (window.innerWidth > 850) {
            caja_trasera_login.style.display = "block";
            caja_trasera_register.style.display = "block";
        } else {
            caja_trasera_register.style.display = "block";
            caja_trasera_register.style.opacity = "1";
            caja_trasera_login.style.display = "none";
            formulario_login.style.display = "block";
            formulario_register.style.display = "none";
            contenedor_login_register.style.left = "0px";
        }
    }

    function mostrarLogin() {
        if (window.innerWidth > 850) {
            formulario_register.style.display = "none";
            contenedor_login_register.style.left = "10px";
            formulario_login.style.display = "block";
            caja_trasera_register.style.opacity = "1";
            caja_trasera_login.style.opacity = "0";
        } else {
            formulario_register.style.display = "none";
            contenedor_login_register.style.left = "0px";
            formulario_login.style.display = "block";
            caja_trasera_register.style.display = "block";
            caja_trasera_login.style.display = "none";
        }
    }

    function mostrarRegistro() {
        if (window.innerWidth > 850) {
            formulario_register.style.display = "block";
            contenedor_login_register.style.left = "410px";
            formulario_login.style.display = "none";
            caja_trasera_register.style.opacity = "0";
            caja_trasera_login.style.opacity = "1";
        } else {
            formulario_register.style.display = "block";
            contenedor_login_register.style.left = "0px";
            formulario_login.style.display = "none";
            caja_trasera_register.style.display = "none";
            caja_trasera_login.style.display = "block";
            caja_trasera_login.style.opacity = "1";
        }
    }

    // --- 4. ASIGNACIÓN DE EVENTOS ---

    // Botones para mover la interfaz
    if (btnMoverALogin) btnMoverALogin.addEventListener("click", mostrarLogin);
    if (btnMoverARegistro) btnMoverARegistro.addEventListener("click", mostrarRegistro);

    // Envío de formularios al servidor
    if (loginForm) loginForm.addEventListener('submit', ejecutarLogin);
    if (registerForm) registerForm.addEventListener('submit', ejecutarRegistro);

    // Ajustes iniciales
    window.addEventListener("resize", anchoPagina);
    anchoPagina();
    actualizarIdentidadUsuario();
});

// --- FUNCIONES GLOBALES ---

async function actualizarIdentidadUsuario() {
    const contenedorNombre = document.getElementById("user-name-text");
    if (!contenedorNombre) return;

    try {
        const respuesta = await fetch('/api/usuario-actual'); // Asegúrate de que esta ruta exista en tu server.js
        const datos = await respuesta.json();
        if (datos.loggedIn) {
            contenedorNombre.textContent = datos.nombre_usuario;
        }
    } catch (e) { console.log("Sesión no iniciada"); }
}