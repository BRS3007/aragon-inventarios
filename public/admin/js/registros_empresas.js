import Swal from 'sweetalert2';

setInterval(() => {
    const now = new Date();
    document.getElementById('clock-time').innerText = now.toLocaleTimeString();
}, 1000);

async function registrarNuevo() {
    const data = {
        nombre_empresa:   document.getElementById('nombreEmpresa').value.trim(),
        plan_suscripcion: document.getElementById('planSuscripcion').value,
        nombre_dueno:     document.getElementById('nombreUsuario').value.trim(),
        rnc_aruba:        document.getElementById('rnc_aruba').value.trim(),
        direccion:        document.getElementById('direccion').value.trim(),
        telefono:         document.getElementById('telefono').value.trim(),
        correo_empresa:   document.getElementById('correo').value.trim(),
        id_personal:      document.getElementById('idPersonal').value.trim(),
        contrasena:       document.getElementById('contrasena').value
    };

    // Validación
    const camposVacios = Object.entries(data).filter(([key, value]) => !value);
    if (camposVacios.length > 0) {
        mostrarRespuesta('Por favor, complete todos los campos', 'error');
        return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.correo_empresa)) {
        mostrarRespuesta('Por favor, ingrese un correo electrónico válido', 'error');
        return;
    }

    // Validar contraseña (mínimo 6 caracteres)
    if (data.contrasena.length < 6) {
        mostrarRespuesta('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        const res = await fetch('/api/admin/setup-full-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        
        if (result.success) {
            mostrarRespuesta('Empresa y Admin registrados correctamente', 'success');
            
            Swal.fire({
                icon: 'success',
                title: '¡Registrado!',
                text: 'La empresa y el administrador se han creado exitosamente.',
                confirmButtonText: 'Aceptar',
                background: '#ffffff'
            }).then(() => {
                document.getElementById('registroForm').reset();
            });
        } else {
            mostrarRespuesta('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarRespuesta('Error de conexión con el servidor', 'error');
    }
}

function mostrarRespuesta(mensaje, tipo) {
    const responseDiv = document.getElementById('response');
    responseDiv.textContent = mensaje;
    responseDiv.className = 'show ' + tipo;
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        responseDiv.className = '';
    }, 5000);
}

// Exponer al window
window.registrarNuevo = registrarNuevo;
