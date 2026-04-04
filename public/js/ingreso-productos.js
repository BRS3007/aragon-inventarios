import { playSound } from './common.js';

let conteoSesion = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Referencias DOM
    const formIngresoProductos = document.getElementById('form-ingreso-productos');
    const inputBarcode = document.getElementById('codigo_de_barras');
    const inputCodigo = document.getElementById('codigo');
    const inputDescripcion = document.getElementById('descripcion');
    const inputCantidad = document.getElementById('cantidad');
    const inputFecha = document.getElementById('fecha');
    const inputPrecio = document.getElementById('precio');
    const inputPasillo = document.getElementById('pasillo');
    const datalistSugerencias = document.getElementById('sugerencias-descripcion');
    const btnLimpiar = document.getElementById('btn-limpiar');
    const btnEscanear = document.getElementById('btn-escanear');
    const btnTomarFoto = document.getElementById('btn-tomar-foto');
    const imagenPreview = document.getElementById('imagen-preview');
    const inputImagen = document.getElementById('input-imagen');
    const productVerification = document.getElementById('product-verification');
    const verificationProductImage = document.getElementById('verification-product-image');
    const noImagePlaceholder = document.getElementById('no-image-placeholder');
    const verificationProductName = document.getElementById('verification-product-name');
    const verificationBarcode = document.getElementById('verification-barcode').querySelector('span');
    const verificationStock = document.getElementById('verification-stock');
    const btnAgregarFoto = document.getElementById('btn-agregar-foto');

    // Configurar fecha actual
    if (inputFecha) {
        inputFecha.value = new Date().toISOString().split('T')[0];
    }

    cargarNombreUsuario();
    actualizarContadorIngresos();

    // ============================================
    // ESCANEAR CÓDIGO DE BARRAS
    // ============================================
    if (btnEscanear) {
        btnEscanear.addEventListener('click', abrirEscanerBarras);
    }

    // ============================================
    // TOMAR FOTO
    // ============================================
    if (btnTomarFoto) {
        btnTomarFoto.addEventListener('click', abrirCameraFoto);
    }

    // Preview de imagen seleccionada
    if (inputImagen) {
        inputImagen.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && imagenPreview) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagenPreview.src = e.target.result;
                    imagenPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ============================================
    // SUGERENCIAS AL ESCRIBIR
    // ============================================
    if (inputDescripcion && datalistSugerencias) {
        let timer;
        inputDescripcion.addEventListener('input', () => {
            clearTimeout(timer);
            const query = inputDescripcion.value.trim();
            
            if (query.length >= 2) {
                timer = setTimeout(async () => {
                    try {
                        const res = await fetch(`/api/buscar?termino=${encodeURIComponent(query)}`);
                        const productos = await res.json();

                        datalistSugerencias.innerHTML = '';
                        
                        productos.forEach(item => {
                            const opt = document.createElement('option');
                            opt.value = item.descripcion;
                            opt.dataset.barras = item.codigo_de_barras || '';
                            opt.dataset.codigo = item.codigo || '';
                            opt.dataset.precio = item.precio || '';
                            opt.dataset.pasillo = item.pasillo || '';
                            datalistSugerencias.appendChild(opt);
                        });
                    } catch (e) { 
                        console.error("Error en sugerencias:", e); 
                    }
                }, 300);
            }
        });

        inputDescripcion.addEventListener('change', () => {
            const valorSeleccionado = inputDescripcion.value;
            const opciones = datalistSugerencias.querySelectorAll('option');
            
            opciones.forEach(opt => {
                if (opt.value === valorSeleccionado) {
                    inputBarcode.value = opt.dataset.barras || '';
                    inputCodigo.value = opt.dataset.codigo || '';
                    inputPrecio.value = opt.dataset.precio || '';
                    inputPasillo.value = opt.dataset.pasillo || '';
                    if (inputCantidad) inputCantidad.focus();
                }
            });
        });
    }

    // Búsqueda por código de barras
    if (inputBarcode) {
        inputBarcode.addEventListener('change', async () => {
            const barcode = inputBarcode.value.trim();
            if (barcode.length < 1) return;

            try {
                const res = await fetch(`/api/buscar?termino=${encodeURIComponent(barcode)}`);
                const productos = await res.json();
                
                if (productos.length > 0) {
                    fillFormFields(productos[0]);
                }
            } catch (e) { 
                console.error("Error buscando por barras:", e); 
            }
        });
    }

    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && formIngresoProductos) {
            formIngresoProductos.reset();
            if (datalistSugerencias) datalistSugerencias.innerHTML = '';
            if (imagenPreview) imagenPreview.style.display = 'none';
            hideProductVerification();
            if (inputBarcode) inputBarcode.focus();
        }
    });

    // Envío del formulario
    formIngresoProductos.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('codigo_de_barras', inputBarcode.value.trim());
        formData.append('codigo', inputCodigo.value.trim());
        formData.append('descripcion', inputDescripcion.value.trim());
        formData.append('cantidad', inputCantidad.value.trim());
        formData.append('precio', inputPrecio.value.trim());
        formData.append('pasillo', inputPasillo.value.trim());
        formData.append('fecha', inputFecha.value);

        // Agregar imagen si existe
        if (inputImagen && inputImagen.files[0]) {
            formData.append('imagen', inputImagen.files[0]);
        }

        if (!inputDescripcion.value.trim() || !inputCantidad.value.trim()) {
            showToast("Por favor rellena Descripción y Cantidad", "error");
            playSound('error');
            return;
        }

        try {
            const res = await fetch('/api/guardar-producto', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();

            if (result.success) {
                playSound('success');
                showToast("Producto guardado exitosamente", "success");
                actualizarContadorIngresos();
                
                formIngresoProductos.reset();
                inputFecha.value = new Date().toISOString().split('T')[0];
                if (datalistSugerencias) datalistSugerencias.innerHTML = '';
                if (imagenPreview) imagenPreview.style.display = 'none';
                hideProductVerification();
                inputBarcode.focus();
            } else {
                playSound('error');
                showToast("Error: " + result.message, "error");
            }
        } catch (error) {
            console.error("Error al guardar:", error);
            playSound('error');
            showToast("Error de conexión con el servidor", "error");
        }
    });

    // Botón limpiar
    if (btnLimpiar && formIngresoProductos) {
        btnLimpiar.addEventListener('click', () => {
            formIngresoProductos.reset();
            if (datalistSugerencias) datalistSugerencias.innerHTML = '';
            if (imagenPreview) imagenPreview.style.display = 'none';
            hideProductVerification();
            if (inputBarcode) inputBarcode.focus();
        });
    }

    function fillFormFields(product) {
        if (!product) return;
        inputBarcode.value = product.codigo_de_barras || '';
        inputCodigo.value = product.codigo || '';
        inputDescripcion.value = product.descripcion || '';
        inputPrecio.value = product.precio || '';
        inputPasillo.value = product.pasillo || '';
        
        // Mostrar sección de verificación con imagen del producto
        showProductVerification(product);
        
        // Si el producto existe pero no tiene imagen, mostrar botón para tomar foto
        if (product.codigo_de_barras && !product.imagen_url) {
            if (btnTomarFoto) {
                btnTomarFoto.style.display = 'inline-flex';
                btnTomarFoto.dataset.barcode = product.codigo_de_barras;
            }
        }
        
        inputCantidad.focus();
    }
    
    function showProductVerification(product) {
        if (!productVerification) return;
        
        // Actualizar datos del producto
        verificationProductName.textContent = product.descripcion || 'Sin descripción';
        verificationBarcode.textContent = product.codigo_de_barras || 'N/A';
        verificationStock.textContent = product.cantidad || 0;
        
        // Manejar imagen
        if (product.imagen_url) {
            verificationProductImage.src = product.imagen_url;
            verificationProductImage.style.display = 'block';
            noImagePlaceholder.style.display = 'none';
            verificationProductImage.classList.remove('no-image');
        } else {
            verificationProductImage.style.display = 'none';
            noImagePlaceholder.style.display = 'flex';
            verificationProductImage.classList.add('no-image');
        }
        
        // Guardar barcode para cuando se tome foto
        if (btnAgregarFoto) {
            btnAgregarFoto.dataset.barcode = product.codigo_de_barras || '';
        }
        
        // Mostrar la sección de verificación
        productVerification.classList.add('active');
        
        // Esconder preview de imagen anterior
        if (imagenPreview) {
            imagenPreview.style.display = 'none';
        }
    }
    
    function hideProductVerification() {
        if (productVerification) {
            productVerification.classList.remove('active');
        }
    }
    
    // Botón para agregar foto desde la sección de verificación
    if (btnAgregarFoto) {
        btnAgregarFoto.addEventListener('click', () => {
            const barcode = btnAgregarFoto.dataset.barcode;
            if (barcode) {
                abrirCameraFoto(barcode);
            }
        });
    }
});

// ============================================
// FUNCIONES DE ESCANEAR CÓDIGO DE BARRAS
// ============================================
async function abrirEscanerBarras() {
    try {
        // Verificar si el navegador soporta la API de cámara
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast("Tu navegador no soporta la cámara", "error");
            return;
        }

        // Crear modal
        const modal = document.createElement('div');
        modal.id = 'scanner-modal';
        modal.innerHTML = `
            <div class="scanner-container">
                <div class="scanner-header">
                    <h3><i class="fa-solid fa-barcode"></i> Escanear Código</h3>
                    <button class="scanner-close" onclick="cerrarEscaner()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="scanner-body">
                    <div id="scanner-viewport"></div>
                    <div class="scanner-instructions">
                        <p>Apunta la cámara al código de barras</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Cargar librería QuaggaJS dinámicamente
        await loadScript('https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.8.4/dist/quagga.min.js');

        // Iniciar escaneo
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#scanner-viewport'),
                constraints: {
                    facingMode: "environment"
                }
            },
            decoder: {
                readers: [
                    "code_128_reader",
                    "ean_reader",
                    "ean_8_reader",
                    "code_39_reader",
                    "upc_reader",
                    "upc_e_reader"
                ]
            },
            locate: true
        }, function(err) {
            if (err) {
                console.error(err);
                showToast("Error al acceder a la cámara", "error");
                cerrarEscaner();
                return;
            }
            Quagga.start();
        });

        Quagga.onDetected(function(result) {
            const code = result.codeResult.code;
            if (code) {
                playSound('success');
                document.getElementById('codigo_de_barras').value = code;
                cerrarEscaner();
                showToast("Código detectado: " + code, "success");
                
                // Buscar producto automáticamente
                setTimeout(async () => {
                    try {
                        const res = await fetch(`/api/buscar?termino=${encodeURIComponent(code)}`);
                        const productos = await res.json();
                        
                        if (productos.length > 0) {
                            const product = productos[0];
                            document.getElementById('codigo').value = product.codigo || '';
                            document.getElementById('descripcion').value = product.descripcion || '';
                            document.getElementById('precio').value = product.precio || '';
                            document.getElementById('pasillo').value = product.pasillo || '';
                            
                            // Mostrar sección de verificación con imagen
                            showProductVerification(product);
                            
                            // Si no tiene imagen, ofrecer tomar una
                            if (!product.imagen_url) {
                                const btnFoto = document.getElementById('btn-tomar-foto');
                                if (btnFoto) {
                                    btnFoto.style.display = 'inline-flex';
                                    btnFoto.dataset.barcode = code;
                                }
                            }
                        } else {
                            // Producto nuevo - esconder verificación
                            hideProductVerification();
                        }
                    } catch (e) {
                        console.error("Error:", e);
                    }
                }, 100);
            }
        });

    } catch (error) {
        console.error("Error:", error);
        showToast("Error al abrir el escáner", "error");
    }
}

function cerrarEscaner() {
    if (window.Quagga) {
        Quagga.stop();
    }
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.remove();
}

// ============================================
// FUNCIONES DE TOMAR FOTO
// ============================================
let streamVideo = null;

async function abrirCameraFoto(barcode = null) {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast("Tu navegador no soporta la cámara", "error");
            return;
        }

        const barcodeParam = barcode || document.getElementById('codigo_de_barras')?.value;
        
        // Crear modal
        const modal = document.createElement('div');
        modal.id = 'camera-modal';
        modal.innerHTML = `
            <div class="camera-container">
                <div class="camera-header">
                    <h3><i class="fa-solid fa-camera"></i> Tomar Foto del Producto</h3>
                    <button class="camera-close" onclick="cerrarCamara()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="camera-body">
                    <video id="camera-video" autoplay playsinline></video>
                    <canvas id="camera-canvas" style="display:none;"></canvas>
                    <img id="photo-preview" style="display:none; max-width: 100%; border-radius: 8px;">
                </div>
                <div class="camera-footer">
                    <button class="btn-capture" id="btn-capture">
                        <i class="fa-solid fa-circle"></i> Capturar
                    </button>
                    <button class="btn-save" id="btn-save" style="display:none;">
                        <i class="fa-solid fa-check"></i> Guardar
                    </button>
                    <button class="btn-retake" id="btn-retake" style="display:none;">
                        <i class="fa-solid fa-rotate-right"></i> Repetir
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Acceder a la cámara
        streamVideo = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });

        const video = document.getElementById('camera-video');
        video.srcObject = streamVideo;

        // Botón capturar
        document.getElementById('btn-capture').addEventListener('click', () => {
            const videoEl = document.getElementById('camera-video');
            const canvas = document.getElementById('camera-canvas');
            const preview = document.getElementById('photo-preview');
            
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            canvas.getContext('2d').drawImage(videoEl, 0, 0);
            
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            preview.src = imageData;
            preview.style.display = 'block';
            video.style.display = 'none';
            
            document.getElementById('btn-capture').style.display = 'none';
            document.getElementById('btn-save').style.display = 'inline-flex';
            document.getElementById('btn-retake').style.display = 'inline-flex';
            
            // Guardar datos para usar después
            modal.dataset.imageData = imageData;
            modal.dataset.barcode = barcodeParam;
        });

        // Botón repetir
        document.getElementById('btn-retake').addEventListener('click', () => {
            const videoEl = document.getElementById('camera-video');
            const preview = document.getElementById('photo-preview');
            
            preview.style.display = 'none';
            videoEl.style.display = 'block';
            
            document.getElementById('btn-capture').style.display = 'inline-flex';
            document.getElementById('btn-save').style.display = 'none';
            document.getElementById('btn-retake').style.display = 'none';
        });

        // Botón guardar
        document.getElementById('btn-save').addEventListener('click', async () => {
            const imageData = modal.dataset.imageData;
            const codeBarcode = modal.dataset.barcode;
            
            try {
                const res = await fetch('/api/guardar-imagen-producto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        codigo_de_barras: codeBarcode,
                        imagen: imageData
                    })
                });
                
                const result = await res.json();
                
                if (result.success) {
                    playSound('success');
                    showToast("Imagen guardada exitosamente", "success");
                    
                    // Mostrar preview en el formulario
                    const previewImg = document.getElementById('imagen-preview');
                    if (previewImg) {
                        previewImg.src = imageData;
                        previewImg.style.display = 'block';
                    }
                    
                    cerrarCamara();
                } else {
                    playSound('error');
                    showToast("Error: " + result.message, "error");
                }
            } catch (error) {
                console.error("Error:", error);
                playSound('error');
                showToast("Error al guardar la imagen", "error");
            }
        });

    } catch (error) {
        console.error("Error:", error);
        showToast("Error al acceder a la cámara", "error");
    }
}

function cerrarCamara() {
    if (streamVideo) {
        streamVideo.getTracks().forEach(track => track.stop());
        streamVideo = null;
    }
    const modal = document.getElementById('camera-modal');
    if (modal) modal.remove();
}

// Función helper para cargar scripts
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Funciones globales
window.abrirEscanerBarras = abrirEscanerBarras;
window.cerrarEscaner = cerrarEscaner;
window.abrirCameraFoto = abrirCameraFoto;
window.cerrarCamara = cerrarCamara;
window.showProductVerification = showProductVerification;
window.hideProductVerification = hideProductVerification;

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

async function actualizarContadorIngresos() {
    const spanContador = document.getElementById('contador-ingresos');
    if (!spanContador) return;

    try {
        const response = await fetch('/api/ingresos-hoy');
        const data = await response.json();
        spanContador.textContent = data.total || 0;
    } catch (error) {
        console.error("Error al actualizar contador:", error);
    }
}

function showToast(mensaje, tipo = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    
    const icon = tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `
        <i class="fa-solid ${icon} toast-icon"></i>
        <span class="toast-message">${mensaje}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function cerrarModal() {
    const modal = document.getElementById('modal-historial') || document.getElementById('modal-aprobaciones');
    if (modal) modal.classList.remove('active');
}

window.cerrarModal = cerrarModal;
window.showToast = showToast;
