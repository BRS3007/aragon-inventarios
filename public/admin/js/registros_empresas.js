// Reloj en tiempo real
        setInterval(() => {
            const now = new Date();
            document.getElementById('clock').innerText = now.toLocaleTimeString();
        }, 1000);

async function registrarNuevo() {
    try {
        // Buscamos el contenedor específico para evitar errores de null
        const formulario = document.querySelector('.card-roja');
        const campos = formulario.querySelectorAll('input');
        const plan = formulario.querySelector('select').value;

        // 2. Extraemos los valores usando los IDs del HTML
        const data = {
            nombre_empresa:   document.getElementById('nombreEmpresa').value,
            plan_suscripcion: document.getElementById('planSuscripcion').value,
            nombre_dueno:     document.getElementById('nombreUsuario').value,
            rnc_aruba:        document.getElementById('rnc_aruba').value,
            direccion:        document.getElementById('direccion').value,
            telefono:         document.getElementById('telefono').value,
            correo_empresa:   document.getElementById('correo').value,
            id_personal:      document.getElementById('idPersonal').value,
            contrasena:       document.getElementById('contrasena').value
        };

        // Verificación básica antes de enviar
        if (Object.values(data).some(v => v === "")) {
            alert("⚠️ Asegúrate de llenar todos los campos correctamente."); //
            return;
        }

        const res = await fetch('/api/admin/setup-full-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (result.success) {
            alert("✅ Empresa y Admin registrados correctamente.");
            location.reload();
        } else {
            alert("❌ Error: " + result.message);
        }

    } catch (error) {
        console.error("Fallo en la petición:", error); //
    }
}
// Función para enviar el correo según el plan

// Ejemplo de activación de funciones según el plan
function configurarInterfaz(plan) {
    if (plan === 'basico') {
        // Ocultar botones de funciones premium como 'Averías'
        const btnAveria = document.getElementById('reportar-averia-tab');
        if (btnAveria) btnAveria.style.display = 'none';
    }
}

// Ejemplo de middleware para proteger por plan
