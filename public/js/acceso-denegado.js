      const logoutBtn = document.getElementById('logout-btn-nav');
      if (logoutBtn) {
          logoutBtn.addEventListener('click', async (e) => {
              e.preventDefault();
              try {
                  const response = await fetch('/logout');
                  const result = await response.json();
                  if (result.success) {
                      alert(result.message);
                      window.location.href = '/';
                  } else {
                      alert('Error al cerrar sesion: ' + result.message);
                  }
              } catch (error) {
                  console.error('Error al cerrar sesion:', error);
                  alert('Ocurrio un error al intentar cerrar sesion.');
              }
          });
      }
async function mostrarNombreReal() {
    try {
        const respuesta = await fetch('/api/nombre-usuario');
        const datos = await respuesta.json();
        
        const spanNombre = document.getElementById("user-name-text");
        if (spanNombre) {
            // Aquí 'datos.nombre' debe coincidir con la llave del JSON del servidor
            spanNombre.textContent = datos.nombre; 
        }
    } catch (error) {
        console.error("Error al obtener el nombre de la base de datos:", error);
    }
}

document.addEventListener("DOMContentLoaded", mostrarNombreReal);