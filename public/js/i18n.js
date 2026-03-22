// i18n.js
// Importaciones desde CDN
import i18next from "i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export const i18n = i18next;
let isUpdating = false; // 🚩 La llave maestra para evitar que la página se congele

export function updateContent() {
    if (isUpdating) return; 
    isUpdating = true; // Bloqueamos nuevas actualizaciones mientras trabajamos

    const elements = document.querySelectorAll("[data-i18n]");
    
    elements.forEach(el => {
        let rawKey = el.getAttribute("data-i18n");
        let isPlaceholder = false;

        if (rawKey.startsWith("[placeholder]")) {
            isPlaceholder = true;
            rawKey = rawKey.replace("[placeholder]", "");
        }

        // Corrección automática: login.title -> login:title
        const key = rawKey.includes('.') ? rawKey.replace('.', ':') : rawKey;
        
        // Solo intentamos traducir si la clave existe para evitar mostrar "login_title" literal
        if (i18n.exists(key)) {
            const translation = i18n.t(key);

            if (isPlaceholder) {
                if (el.placeholder !== translation) el.placeholder = translation;
            } else if (el.tagName === "INPUT" || el.tagName === "BUTTON") {
                // 💡 Esto arreglará tus botones "Ingresar" y "Guardar"
                if (el.value !== translation) el.value = translation;
                // Si el botón tiene el texto dentro de las etiquetas y no en el atributo value:
                if (el.innerText !== translation) el.innerText = translation;
            } else {
                if (el.innerHTML !== translation) el.innerHTML = translation;
            }
        }
    });

    // Título de la pestaña
    const BRAND = "ARAGON Smart Inventories";
    const appContainer = document.getElementById('app-container');
    const view = appContainer?.getAttribute("data-current-view");
    if (view) {
        const pageTitle = i18n.t(`titles:${view}`, { defaultValue: "" });
        document.title = pageTitle ? `${pageTitle} | ${BRAND}` : BRAND;
    } else {
        document.title = BRAND;
    }

    // Liberamos el bloqueo después de un breve respiro para el navegador
    setTimeout(() => { isUpdating = false; }, 100);
}

function startDOMObserver() {
    const observer = new MutationObserver((mutations) => {
        // Solo disparamos si el cambio no lo hicimos nosotros
        if (!isUpdating) {
            updateContent();
        }
    });

    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        characterData: true // Vigilamos cambios de texto también
    });
}

// --- INICIALIZACIÓN ---
i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .init({
        supportedLngs: ['en', 'es', 'pap', 'zh'],
        fallbackLng: "es",
        debug: true, 
        backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
        ns: ["translation", "login", "ingreso_productos", "averias", "common", "importar", "acceso_denegado", "registros"], 
        defaultNS: "translation",
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    })
    .then(() => {
        // Al terminar de cargar i18n, activamos todo:
        i18n.on('languageChanged', () => updateContent());
        
        const langSelect = document.getElementById("language-switcher");
        if (langSelect) {
            langSelect.addEventListener("change", (e) => i18n.changeLanguage(e.target.value));
        }
        
    /**
 * Función para actualizar el reloj y la fecha en tiempo real
 */
function startLiveClock() {
    const clockElement = document.getElementById("live-clock");
    if (!clockElement) return;

    setInterval(() => {
        const now = new Date();
        const currentLng = i18n.language || 'es';

        const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };

        let dateString = now.toLocaleDateString(currentLng, dateOptions);
        dateString = dateString.charAt(0).toUpperCase() + dateString.slice(1);
        
        const timeString = now.toLocaleTimeString(currentLng, timeOptions);

        // Agregamos iconos: 'fa-calendar-days' y 'fa-clock'
        clockElement.innerHTML = `
            <i class="fa-regular fa-calendar-days" style="margin-right: 8px; color: #666;"></i>
            <span>${dateString}</span> 
            <span style="margin: 0 15px; color: #ccc;">|</span>
            <i class="fa-regular fa-clock" style="margin-right: 8px; color: #e60000;"></i>
            <strong>${timeString}</strong>
        `;
    }, 1000);
}

// --- INICIALIZACIÓN CORREGIDA (Sin los puntos suspensivos) ---


        startDOMObserver();
        updateContent();
        startLiveClock(); // 🚀 ¡Aquí activamos el reloj!
    });
