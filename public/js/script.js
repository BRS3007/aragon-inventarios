import Swal from 'sweetalert2';
import { playSound } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. REFERENCIAS AL DOM ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

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
                
                playSound('success');

                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido!',
                    text: 'Ingresando al sistema...',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#ffffff',
                    timerProgressBar: true
                }).then(() => {
                    window.location.href = '/ingreso-productos';
                });
            } else {
                playSound('error');
                let icono = result.message.includes('confirmar') ? 'warning' : 'error';
                Swal.fire({ 
                    icon: icono, 
                    title: 'Atención', 
                    text: result.message,
                    background: '#ffffff'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            playSound('error');
            Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
        }
    }

    async function ejecutarRegistro(event) {
        event.preventDefault();
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        Swal.fire({
            title: 'Procesando...',
            didOpen: () => { Swal.showLoading(); },
            background: '#ffffff'
        });

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                playSound('success');
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: 'Verifica tu correo para activar tu cuenta.',
                    background: '#ffffff'
                }).then(() => {
                    registerForm.reset();
                    if (tabLogin) tabLogin.click();
                });
            } else {
                playSound('error');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message,
                    background: '#ffffff'
                });
            }
        } catch (error) {
            playSound('error');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error de conexión',
                background: '#ffffff'
            });
        }
    }

    // --- 3. FUNCIONES DE DISEÑO (TABS) ---

    function mostrarLogin() {
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
        if (loginForm) loginForm.classList.add('active');
        if (registerForm) registerForm.classList.remove('active');
    }

    function mostrarRegistro() {
        if (tabRegister) tabRegister.classList.add('active');
        if (tabLogin) tabLogin.classList.remove('active');
        if (registerForm) registerForm.classList.add('active');
        if (loginForm) loginForm.classList.remove('active');
    }

    // --- 4. ASIGNACIÓN DE EVENTOS ---

    if (tabLogin) tabLogin.addEventListener('click', mostrarLogin);
    if (tabRegister) tabRegister.addEventListener('click', mostrarRegistro);

    if (loginForm) loginForm.addEventListener('submit', ejecutarLogin);
    if (registerForm) registerForm.addEventListener('submit', ejecutarRegistro);

    actualizarIdentidadUsuario();
});

// --- FUNCIONES GLOBALES ---

async function actualizarIdentidadUsuario() {
    const contenedorNombre = document.getElementById("user-name-text");
    if (!contenedorNombre) return;

    try {
        const respuesta = await fetch('/api/usuario-actual');
        const datos = await respuesta.json();
        if (datos.loggedIn) {
            contenedorNombre.textContent = datos.nombre_usuario;
        }
    } catch (e) { 
        console.log("Sesión no iniciada"); 
    }
}
