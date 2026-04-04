// common.js
import { i18n } from "./i18n.js";

// ============================================
// FUNCIONES DE SONIDO
// ============================================
const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

const sounds = {
    success: new Audio('/sounds/success.mp3'),
    error: new Audio('/sounds/error.mp3')
};

sounds.success.volume = 0.5;
sounds.error.volume = 0.5;

export function playSound(type) {
    if (!soundEnabled) return;
    
    const sound = sounds[type];
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(err => {
            console.log('Audio playback prevented:', err.message);
        });
    }
}

// Función global para usar desde HTML inline
window.playSound = playSound;

document.addEventListener('DOMContentLoaded', () => {
    // ============================================
    // CERRAR SESIÓN
    // ============================================
    async function handleLogout() {
        try {
            const response = await fetch('/api/logout', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                window.location.href = '/';
            } else {
                const errorText = await response.text();
                console.error("Respuesta del servidor no exitosa:", errorText);
                alert("No se pudo cerrar la sesión en el servidor.");
            }
        } catch (error) {
            console.error("Error de red al cerrar sesión:", error);
            window.location.href = '/';
        }
    }

    const logoutButtons = document.querySelectorAll('#logout-btn-nav');
    logoutButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                await handleLogout();
            });
        }
    });

    // ============================================
    // TRADUCCIONES
    // ============================================
    if (typeof window.updateContent === 'function') {
        window.updateContent();
    }
});
