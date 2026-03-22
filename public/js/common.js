// common.js
import { i18n } from "./i18n.js"; // Añade esta línea para importar el módulo

document.addEventListener('DOMContentLoaded', () => {
    // Funcion para manejar el cierre de sesion
    async function handleLogout() {
    try {
        const response = await fetch('/api/logout', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        // Solo intentamos leer JSON si la respuesta fue exitosa (200 OK)
        if (response.ok) {
            window.location.href = '/'; // Redirige al login
        } else {
            const errorText = await response.text(); // Leemos como texto para ver el error
            console.error("Respuesta del servidor no exitosa:", errorText);
            alert("No se pudo cerrar la sesión en el servidor.");
        }
    } catch (error) {
        console.error("Error de red al cerrar sesión:", error);
        // En caso de error crítico, forzamos salida al login para no bloquear al usuario
        window.location.href = '/';
    }
}
    // Buscar todos los botones/enlaces con el ID 'logout-btn-nav' y adjuntar el evento
    const logoutButtons = document.querySelectorAll('#logout-btn-nav');
    logoutButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                await handleLogout();
            });
        }
    });

    // Asegurarse de que el script i18n.js ya se ha cargado antes de usarlo
    if (typeof window.updateContent === 'function') {
        window.updateContent();
    }
});