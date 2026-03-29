// server.js
import pkg from 'xlsx';
const { readFile, utils } = pkg;
import fs from 'fs';
import path from 'path';

import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import axios from 'axios';       
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import ExcelJS from 'exceljs';   
import cors from 'cors';         
import multer from 'multer';
import nodemailer from 'nodemailer';
import chokidar from 'chokidar';

// 1. OBTENER RUTAS EN MÓDULOS ES (Hacer esto ANTES de usar __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 2. CONFIGURAR MOTOR DE PLANTILLAS EJS
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));

// 3. DESESTRUCTURAR BCRYPT (Opcional pero ayuda a limpiar el código)
const { hash, compare } = bcrypt;

// Configuración del Pool de la Base de Datos
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4_unicode_ci',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0
});

console.log("--- Diagnóstico de Variables ---");
console.log("USER:", process.env.EMAIL_USER);
console.log("PASS cargada:", process.env.EMAIL_PASS ? "SÍ (longitud " + process.env.EMAIL_PASS.length + ")" : "NO");
console.log("--------------------------------");

function verificarPlan(planRequerido) {
    return (req, res, next) => {
        // Obtenemos el plan desde la sesión que guardamos en el login
        const planUsuario = req.session.plan; 
        
        const jerarquia = { 'basico': 1, 'estandar': 2, 'premium': 3 };
        
        if (jerarquia[planUsuario] >= jerarquia[planRequerido]) {
            next();
        } else {
            res.status(403).json({ success: false, message: "Tu plan no incluye esta función." });
        }
    };
}
async function enviarCorreoPlan(email, empresa, plan) {
    const detallesPlanes = {
        basico: {
            nombre: "Básico (Solo Inventario)",
            caracteristicas: "<li>Acceso al módulo de Ingreso de Productos.</li><li>Control de stock inicial.</li>"
        },
        estandar: {
            nombre: "Estándar (Control de Mermas)",
            caracteristicas: "<li>Ingreso de Productos.</li><li>Gestión de Averías y Daños.</li><li>Historial detallado de movimientos.</li>"
        },
        premium: {
            nombre: "Premium (Full Revel POS)",
            caracteristicas: "<li>Todo lo del plan Estándar.</li><li>Integración con App de Facturación.</li><li>Trazabilidad 360° (Ventas + Entradas + Bajas).</li><li>Soporte Prioritario.</li>"
        }
    };

    const infoPlan = detallesPlanes[plan] || detallesPlanes.basico;

    // Usamos el mismo correo para auth y para from
    const correoEmisor = 'gustavoarag.sala@gmail.com';

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { 
            user: process.env.GMAIL_USER, 
            pass: process.env.GMAIL_PASS // Recuerda que esto debe ser una "Contraseña de Aplicación" de Google
        }
    });

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #e63946;">¡Bienvenido a Aragon Smart Inventories!</h2>
        <p>Hola <strong>${empresa}</strong>,</p>
        <p>Tu cuenta ha sido configurada exitosamente en <strong>Aruba</strong>. Estamos felices de acompañarte en el crecimiento de tu negocio.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 5px solid #1d3557;">
            <h3 style="margin-top: 0;">Tu Plan: <span style="color: #1d3557;">${infoPlan.nombre}</span></h3>
            <p><strong>Funciones incluidas:</strong></p>
            <ul>${infoPlan.caracteristicas}</ul>
        </div>

        <p>Ya puedes acceder al panel con tu <strong>ID Personal</strong> y la contraseña que registraste.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">Este es un correo automático de Aragon Smart Inventories, por favor no respondas a esta dirección.</p>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Aragon Smart Inventories" <${correoEmisor}>`,
            to: email,
            subject: `Bienvenido - Activación de Plan ${plan.toUpperCase()}`,
            html: htmlContent
        });
        console.log(`📧 Correo de bienvenida enviado a: ${email}`);
    } catch (error) {
        console.error("❌ Error enviando correo:", error.message);
        // No bloqueamos el flujo principal si el correo falla
    }
}

// Objeto global para rastrear el progreso
let progresoCarga = { total: 0, procesados: 0, estado: 'inactivo' };

async function procesarInventarioMySQL(data, empresa_id, usuario_id = 0) {
    const fecha_actual = new Date();
    const batchSize = 1000;
    
    // Inicializamos el progreso
    progresoCarga = { total: data.length, procesados: 0, estado: 'procesando' };

    for (let i = 0; i < data.length; i += batchSize) {
        const lote = data.slice(i, i + batchSize);
        const valoresInventario = [];
        const valoresRegistros = [];

        lote.forEach(fila => {
            const barcode = String(fila['codigo_de_barras'] || '').trim();
            if (!barcode) return;

            const codigoInterno = String(fila['codigo'] || '').trim() || 'S/C';
            const descripcion = String(fila['descripcion'] || 'Sin descripción').trim();
            const cantidad = parseInt(fila['cantidad']) || 0;
            const precio = fila['precio'] ? parseFloat(String(fila['precio']).replace(/[^0-9.]/g, '')) || 0 : 0;
            const pasillo = String(fila['pasillo'] || 'General').trim();

            valoresInventario.push([barcode, codigoInterno, descripcion, cantidad, precio, empresa_id, fecha_actual, pasillo, usuario_id]);
            valoresRegistros.push([barcode, codigoInterno, descripcion, cantidad, precio, usuario_id, empresa_id, fecha_actual, 'Ingreso', pasillo]);
        });

        try {
            if (valoresInventario.length > 0) {
                await db.query(`INSERT INTO inventario (...) VALUES ? ON DUPLICATE KEY UPDATE ...`, [valoresInventario]);
            }
            if (valoresRegistros.length > 0) {
                await db.query(`INSERT INTO registros (...) VALUES ?`, [valoresRegistros]);
            }
            
            // Actualizamos el contador de progreso
            progresoCarga.procesados += lote.length;
            
        } catch (error) {
            console.error(`❌ Error en bloque ${i}:`, error.message);
        }
    }
    progresoCarga.estado = 'finalizado';
}

// Validación de variables críticas
const variablesRequeridas = [
    'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'RESEND_API_KEY'
];

const faltantes = variablesRequeridas.filter(v => !process.env[v]);

//if (faltantes.length > 0) {
    //console.error("❌ ERROR CRÍTICO: Faltan variables en el archivo .env:");
    //console.error(`⚠️  No se encontraron: ${faltantes.join(', ')}`);
    //process.exit(1); // Detiene el servidor si falta algo importante
//} else 
    {
    console.log("✅ Configuración .env validada correctamente.");
}


// 1. Definir la carpeta que vamos a vigilar
const watchFolder = path.resolve(__filename, '../auto_procesar'); // Ruta absoluta

// Crear la carpeta si no existe
if (!fs.existsSync(watchFolder)) {
    fs.mkdirSync(watchFolder);
}

console.log(`> Vigilando la carpeta: ${watchFolder}`);


app.use(express.static(path.join(__dirname, 'public')));
app.use('/locales', express.static(path.join(__dirname, 'public', 'locales')));


const watcher = chokidar.watch(watchFolder, {
    persistent: true,
    ignoreInitial: false, // Cámbialo a false para que detecte lo que ya esté ahí
    usePolling: true,     // Fuerza al sistema a revisar cambios (útil en Windows/Network drives)
    interval: 100,
    binaryInterval: 300
});

// Agregamos este log para confirmar que el Watcher arrancó
watcher.on('ready', () => {
    console.log('👀 Watcher activado y vigilando:', watchFolder);
    console.log('Carpetas detectadas:', watcher.getWatched());
});

// 3. Evento: Cuando se añade un archivo nuevo
watcher.on('add', async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    // Nota: ExcelJS no soporta .xls (antiguo), así que lo filtramos por seguridad
    if (!['.xlsx', '.csv'].includes(ext)) return;

    try {
        const pathParts = filePath.split(path.sep);
        const nombreCarpeta = pathParts[pathParts.length - 2];

        if (nombreCarpeta === 'auto_procesar') return;

        const nombreReal = nombreCarpeta.replace(/_/g, ' ');
        console.log(`\n⚙️ Watcher: Procesando archivo para la empresa [${nombreReal}]`);

        const [rows] = await db.query("SELECT id FROM empresas WHERE nombre_empresa = ?", [nombreReal]);

        if (rows.length > 0) {
            const empresa_id = rows[0].id;
            
            // --- NUEVA LÓGICA CON EXCELJS ---
            const workbook = new ExcelJS.Workbook();
            if (ext === '.xlsx') {
                await workbook.xlsx.readFile(filePath);
            } else {
                await workbook.csv.readFile(filePath);
            }

            const worksheet = workbook.getWorksheet(1);
            const data = [];

            // Convertimos las filas a un array de objetos (JSON) para procesarInventarioMySQL
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) { // Saltamos encabezado
                    // Adaptamos esto según los nombres de columnas que espera tu función
                    data.push({
                        codigo_de_barras: row.getCell(1).value,
                        descripcion: row.getCell(2).value,
                        cantidad: row.getCell(3).value,
                        precio: row.getCell(4).value
                    });
                }
            });

            if (data.length > 0) {
                await procesarInventarioMySQL(data, empresa_id);
                console.log(`✅ Inventario de "${nombreReal}" actualizado correctamente.`);
            }
        } else {
            console.error(`⚠️ No se encontró la empresa "${nombreReal}".`);
        }

        // --- MOVIMIENTO A SUBCARPETA (Tu lógica original se mantiene igual) ---
        const dirDestino = path.join('./procesados', nombreCarpeta);
        if (!fs.existsSync(dirDestino)) {
            fs.mkdirSync(dirDestino, { recursive: true });
        }

        const destinoFinal = path.join(dirDestino, `${Date.now()}-${path.basename(filePath)}`);

        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.renameSync(filePath, destinoFinal);
                    console.log(`📦 Archivo movido a: ${dirDestino}`);
                }
            } catch (err) {
                console.error("❌ Error al mover el archivo:", err.message);
            }
        }, 2000);

    } catch (error) {
        console.error("❌ Error en el Watcher:", error.message);
    }
});
// Configuración de Multer dinámica
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Normalizamos el nombre (ej: "Empresa A" -> "Empresa_A")
        const nombreEmpresa = (req.session.empresa || 'Generico').replace(/\s+/g, '_'); 
        const dir = path.join('./auto_procesar', nombreEmpresa);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });





// --- 2. MIDDLEWARES ---
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(session({
    secret: '85735afd-7b6b-4e21-9e24-881a04b5a0d67206fe94-be0e-4a5f-ad71-5bc1e210a076',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// CONFIGURACIÓN DEL TRANSPORTADOR
// CONFIGURACIÓN DEL TRANSPORTADOR (GMAIL)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER, // Usamos variables
        pass: process.env.GMAIL_PASS  // Usamos variables
    }
});

// Verificar la conexión
transporter.verify((error) => {
  if (error) {
    console.error("❌ Error con Resend:", error);
  } else {
    console.log("🚀 Resend configurado y listo desde Aruba ✅");
  }
});

// Nueva ruta para que el navegador pregunte cómo va la carga
app.get('/api/status-carga', (req, res) => {
    res.json(progresoCarga);
});

// --- 3. RUTAS DE NAVEGACIÓN ---
app.get('/', (req, res) => {
    if (req.session.loggedIn) res.redirect('/ingreso-productos');
    else res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/ingreso-productos', (req, res) => {
    if (req.session.loggedIn) res.sendFile(path.join(__dirname, 'public', 'ingreso-productos.html'));
    else res.redirect('/');
});

// Ruta exacta que pide tu frontend
app.get('/api/productos/barcode/:barcode', async (req, res) => {
    const { barcode } = req.params;
    const empresa_id = req.session.empresa_id; // Filtrado por empresa para seguridad

    try {
        const [rows] = await db.query(
            'SELECT * FROM inventario WHERE codigo_de_barras = ? AND empresa_id = ?',
            [barcode, empresa_id]
        );

        if (rows.length > 0) {
            // Enviamos el producto encontrado
            res.json({ success: true, product: rows[0] });
        } else {
            // Si no existe, enviamos success false para que el JS limpie los campos
            res.json({ success: false, message: 'Producto no encontrado' });
        }
    } catch (error) {
        console.error("Error en búsqueda por barcode:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Localiza esta ruta en tu archivo de servidor
app.get('/api/historial/:codigoDeBarras', async (req, res) => {
    const { codigoDeBarras } = req.params;
    
    // Si usas sesiones para filtrar por empresa:
    const empresa_id = req.session.empresa_id; 

    try {
        const query = `
            SELECT fecha, tipo, cantidad, precio, pasillo, nombre_usuario 
            FROM registros 
            WHERE codigo_de_barras COLLATE utf8mb4_unicode_ci = ? 
            ORDER BY fecha DESC
        `;
        
        const [rows] = await db.query(query, [codigoDeBarras]);
        
        if (rows.length > 0) {
            res.json({ success: true, data: rows });
        } else {
            res.json({ success: true, data: [], message: "Sin movimientos" });
        }
    } catch (error) {
        console.error("❌ Error en historial:", error.message);
        res.status(500).json({ success: false, message: "Error interno" });
    }
});

app.get('/registros', (req, res) => {
    if (req.session.loggedIn && req.session.role === 'admin') {
        res.sendFile(path.join(__dirname, 'public', 'registros.html'));
    } else res.redirect('/');
});

app.get('/api/ver-todos-los-ingresos', (req, res) => {
    // Si no es admin, no le damos la información de la base de datos
    if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Acceso denegado: Se requiere rol de administrador." });
    }
    // ... continuar con la consulta ...
});
// --- 4. SISTEMA DE LOGIN Y ALTA MAESTRA ---
app.post('/login', async (req, res) => {
    const { id_personal, contrasena } = req.body;
    try {
        // 1. Buscamos al usuario y los datos de su empresa
        const query = `
            SELECT u.*, e.plan_suscripcion, e.nombre_empresa 
            FROM usuarios u 
            JOIN empresas e ON u.empresa_id = e.id 
            WHERE u.id_personal = ?`;
            
        const [results] = await db.query(query, [id_personal]);
        
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }

        const usuario = results[0];

        // --- VALIDACIÓN DE APROBACIÓN (Lo que querías de los empleados) ---
        if (usuario.aprobado_por_admin === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tu cuenta está pendiente de aprobación por el administrador.' 
            });
        }

        // --- COMPARACIÓN DE CONTRASEÑA ---
        // Usamos usuario.contrasena que es el nombre real en tu DB de MariaDB
        const coincide = await bcrypt.compare(contrasena, usuario.contrasena);

        if (coincide) {
            // Guardamos todo en la sesión
            req.session.loggedIn = true;
            req.session.id_personal = usuario.id_personal;
            req.session.nombre_usuario = usuario.nombre_usuario; // Nombre real
            req.session.role = usuario.role;
            req.session.empresa_id = usuario.empresa_id;
            req.session.plan = usuario.plan_suscripcion;
            req.session.empresa = usuario.nombre_empresa; 

            return req.session.save((err) => {
                if (err) return res.status(500).json({ success: false, message: 'Error al guardar sesión' });
                res.json({ 
                    success: true, 
                    plan: usuario.plan_suscripcion, 
                    rol: usuario.role,
                    nombre: usuario.nombre_usuario 
                });
            });
        } else {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

    } catch (error) { 
        console.error("Error en Login:", error);
        res.status(500).json({ success: false, message: "Error interno: " + error.message }); 
    }
});
// En tu server.js
app.get('/api/buscar', async (req, res) => {
    const termino = req.query.termino || '';
    const busqueda = `%${termino}%`;
    const empresa_id = req.session.empresa_id;

    try {
        // IMPORTANTE: Seleccionar todos los campos que el JS necesita
        const [results] = await db.query(
            `SELECT descripcion, codigo_de_barras, codigo, precio, pasillo 
             FROM inventario 
             WHERE empresa_id = ? AND (descripcion LIKE ? OR codigo_de_barras LIKE ?) 
             LIMIT 10`, 
            [empresa_id, busqueda, busqueda]
        );
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
});
// --- Loguear neva empresa

app.post('/api/admin/setup-full-client', async (req, res) => {
    const { 
        nombre_empresa, rnc_aruba, plan_suscripcion, direccion, 
        telefono, correo_empresa, id_personal, contrasena, nombre_dueno 
    } = req.body;

    try {
        // 1. Crear la Empresa
        const qEmpresa = `INSERT INTO empresas 
            (nombre_empresa, rnc_aruba, plan_suscripcion, direccion, telefono, id_personal, nombre_dueno) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        const [empRes] = await db.query(qEmpresa, [
            nombre_empresa, rnc_aruba, plan_suscripcion, direccion, telefono, id_personal, nombre_dueno
        ]);

        const empresaId = empRes.insertId;
        const hash = await bcrypt.hash(contrasena, 10);

        // 2. Crear el Usuario usando nombre_dueno como nombre_usuario
        const qUsuario = `INSERT INTO usuarios 
            (nombre_usuario, id_personal, contrasena, role, empresa_id) 
            VALUES (?, ?, ?, 'admin', ?)`;

        await db.query(qUsuario, [nombre_dueno, id_personal, hash, empresaId]);

        // 3. ENVÍO DE CORREO AUTOMÁTICO
        // Llamamos a la función que creaste antes. 
        // Se coloca aquí para que solo se envíe si la DB no dio error.
        try {
            await enviarCorreoPlan(correo_empresa, nombre_empresa, plan_suscripcion);
            console.log(`Correo de bienvenida enviado a: ${correo_empresa}`);
        } catch (mailError) {
            // Logueamos el error del correo pero NO detenemos la respuesta exitosa,
            // ya que el usuario ya se creó en la base de datos.
            console.error("Error al enviar el correo, pero el registro fue exitoso:", mailError);
        }

        res.json({ success: true, message: "Registro completo y correo enviado" });

    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 5. GESTIÓN DE INVENTARIO (PROTECCIÓN POR EMPRESA) ---
// Ruta para guardar productos con TRANSACCIÓN (Seguridad Multi-usuario)
app.post('/api/guardar-producto', async (req, res) => {
    const { codigo_de_barras, codigo, descripcion, cantidad, precio, pasillo, fecha } = req.body;
    const empresa_id = req.session.empresa_id;
    const usuarioNombre = req.session.nombre_usuario; 
    const usuarioId = req.session.id_personal; 

    if (!empresa_id || !usuarioId) {
        return res.status(401).json({ success: false, message: "Sesión no válida" });
    }

    try {
        const barcodeLimpio = (codigo_de_barras === 'undefined' || !codigo_de_barras) ? null : codigo_de_barras;

        // 1. ACTUALIZAR O INSERTAR EN INVENTARIO
        const sqlProducto = `
            INSERT INTO inventario (codigo_de_barras, codigo, descripcion, cantidad, precio, pasillo, fecha, empresa_id, id_personal_usuario) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            cantidad = cantidad + VALUES(cantidad), 
            precio = VALUES(precio), 
            pasillo = VALUES(pasillo),
            id_personal_usuario = VALUES(id_personal_usuario)`;

        await db.query(sqlProducto, [barcodeLimpio, codigo, descripcion, cantidad, precio, pasillo, fecha, empresa_id, usuarioId]);

        // 2. GUARDAR EN REGISTROS (Para que aparezca en el historial)
        // Usamos 'INGRESO MANUAL' para diferenciarlo de 'IMPORTACIÓN'
        const sqlHistorial = `
            INSERT INTO registros 
            (codigo_de_barras, codigo, descripcion, precio, tipo, cantidad, empresa_id, nombre_usuario, pasillo, fecha) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

        await db.query(sqlHistorial, [
            barcodeLimpio,      // codigo_de_barras
            codigo,             // codigo (interno)
            descripcion,        // descripcion
            precio,             // precio
            'Ingreso Manual',   // tipo
            cantidad,           // cantidad
            empresa_id,         // empresa_id
            usuarioNombre,      // nombre_usuario
            pasillo             // pasillo
        ]);

        res.json({ success: true, message: "Producto e Historial actualizados ✅" });

    } catch (err) {
        console.error("Error detallado:", err.message);
        res.status(500).json({ success: false, message: "Error al guardar: " + err.message });
    }
});
app.get('/api/productos/filtrar', async (req, res) => {
    const empresa_id = req.session.empresa_id; 
    const { pagina = 1, limite = 10, q, fecha } = req.query; // Capturamos filtros
    
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    if (!empresa_id) {
        return res.status(401).json({ error: "Sesión no válida" });
    }

    try {
        let sql = `
            SELECT 
                codigo_de_barras, codigo, descripcion, 
                SUM(cantidad) AS cantidad, MAX(fecha) AS fecha, 
                precio, pasillo 
            FROM inventario 
            WHERE empresa_id = ?`;
        
        const params = [empresa_id];

        // --- FILTRO DE BÚSQUEDA (Nombre o Código) ---
        if (q) {
            sql += ` AND (descripcion LIKE ? OR codigo_de_barras LIKE ? OR codigo LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        // --- FILTRO DE FECHA ---
        if (fecha) {
            sql += ` AND DATE(fecha) = ?`;
            params.push(fecha);
        }

        sql += ` GROUP BY codigo_de_barras, codigo, descripcion, precio, pasillo
                 ORDER BY fecha DESC 
                 LIMIT ? OFFSET ?`;
        
        params.push(parseInt(limite), offset);

        const [productos] = await db.query(sql, params);
        
        // Ajustamos el conteo total para que la paginación sea real con el filtro
        const [totalRes] = await db.query(
            'SELECT COUNT(DISTINCT codigo_de_barras) as total FROM inventario WHERE empresa_id = ?', 
            [empresa_id]
        );
        const totalPaginas = Math.ceil(totalRes[0].total / parseInt(limite));

        res.json({ 
            productos,
            totalPaginas,
            paginaActual: parseInt(pagina) 
        });

    } catch (e) {
        console.error("Error en filtro:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- 6. EXPORTACIÓN Y AVERÍAS ---
app.get('/api/exportar', async (req, res) => {
    // 1. Verificación de Seguridad
    if (!req.session.loggedIn || req.session.role !== 'admin') {
        return res.status(403).send('No autorizado');
    }

    const { fechaInicio, fechaFin } = req.query;
    const empresa_id = req.session.empresa_id;

    // 2. Consulta SQL Unificada (Registros + Averías)
    let sql = `
        SELECT * FROM (
            -- Bloque de Registros
            SELECT 
                r.codigo_de_barras AS m_codigo, 
                i.descripcion AS m_descripcion, 
                r.cantidad AS m_cantidad, 
                i.precio AS m_precio, 
                r.tipo AS motivo, 
                r.fecha AS m_fecha,
                r.nombre_usuario AS m_usuario
            FROM registros r
            LEFT JOIN inventario i ON r.codigo_de_barras = i.codigo_de_barras 
            WHERE r.empresa_id = ?

            UNION ALL

            -- Bloque de Averías
            SELECT 
                a.codigo_de_barras AS m_codigo, 
                a.descripcion_averia AS m_descripcion, 
                a.cantidad AS m_cantidad, 
                i.precio AS m_precio, 
                'AVERIA' AS motivo, 
                a.fecha_averia AS m_fecha,
                'Sistema' AS m_usuario
            FROM averias a
            LEFT JOIN inventario i ON a.codigo_de_barras = i.codigo_de_barras
            WHERE a.empresa_id = ?
        ) AS todo_junto
        WHERE 1=1`;
    
    const params = [empresa_id, empresa_id];

    // Filtro de fechas dinámico
    if (fechaInicio && fechaFin) { 
        sql += " AND m_fecha >= ? AND m_fecha <= ? "; 
        params.push(`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`); 
    }

    sql += " ORDER BY m_fecha DESC";

    try {
        const [results] = await db.query(sql, params);

        // 3. Configuración del Libro de Excel (ExcelJS)
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Movimientos Detallados');

        // Definición de columnas
        worksheet.columns = [
            { header: 'Fecha y Hora', key: 'fecha_formateada', width: 22 },
            { header: 'Motivo / Tipo', key: 'motivo', width: 20 },
            { header: 'Código', key: 'm_codigo', width: 15 },
            { header: 'Descripción', key: 'm_descripcion', width: 35 },
            { header: 'Cant.', key: 'm_cantidad', width: 10 },
            { header: 'Precio U.', key: 'm_precio', width: 12 },
            { header: 'Usuario', key: 'm_usuario', width: 15 }
        ];

        // 4. Estilo Visual (Rojo Aragon)
        const headerRow = worksheet.getRow(1);
        headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' } // Rojo profesional
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // 5. Carga de Datos
        results.forEach(row => {
            worksheet.addRow({
                ...row,
                m_codigo: row.m_codigo || 'N/A',
                m_descripcion: row.m_descripcion || 'Sin descripción',
                m_precio: row.m_precio ? parseFloat(row.m_precio) : 0,
                // Formato de fecha para el usuario
                fecha_formateada: row.m_fecha ? new Date(row.m_fecha).toLocaleString('es-ES') : 'N/A'
            });
        });

        // Aplicar formato de moneda a la columna de precio
        worksheet.getColumn('m_precio').numFmt = '"$"#,##0.00';

        // 6. Configuración de descarga
        // Usamos la fecha local de Aruba (configurando TZ=America/Curacao en Railway)
        const fechaParaNombre = new Date().toLocaleDateString('sv-SE'); 
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Reporte_Aragon_${fechaParaNombre}.xlsx`);

        // 7. Envío del archivo
        await workbook.xlsx.write(res);
        
        // No es necesario res.end() con ExcelJS, pero terminamos la ejecución
        return;

    } catch (e) { 
        console.error("❌ Error en exportación:", e);
        if (!res.headersSent) {
            res.status(500).send("Error al generar el archivo Excel.");
        }
    }
});

// --- 7. SINCRONIZACIÓN REVEL POS ---
app.post('/api/sincronizar-revel', async (req, res) => {
    const empresaId = req.session.empresa_id;
    // Configuración placeholder (se debe jalar de la DB)
    const REVEL = { apiKey: 'KEY_PRUEBA', apiSecret: 'SECRET_PRUEBA', baseUrl: 'https://aruba.revelup.com' };
    try {
        // Lógica de axios aquí...
        res.json({ success: true, message: "Sincronización simulada con éxito" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// RUTA PARA ACTIVAR LA CUENTA DESDE EL CORREO
app.post('/api/aprobar-empleado', async (req, res) => {
    const { usuario_id } = req.body;
    const admin_empresa_id = req.session.empresa_id;
    const admin_rol = req.session.role;

    if (!admin_empresa_id || admin_rol !== 'admin') {
        return res.status(403).json({ success: false, message: "No autorizado" });
    }

    try {
        const [empleado] = await db.query(
            "SELECT email, nombre_usuario FROM usuarios WHERE id = ? AND empresa_id = ?", 
            [usuario_id, admin_empresa_id]
        );

        if (empleado.length === 0) {
            return res.status(404).json({ success: false, message: "Empleado no encontrado" });
        }

        const { email, nombre_usuario } = empleado[0];

        const sqlUpdate = `UPDATE usuarios SET aprobado_por_admin = 1 
                           WHERE id = ? AND empresa_id = ? AND verificado = 1`;
        
        const [result] = await db.query(sqlUpdate, [usuario_id, admin_empresa_id]);

        if (result.affectedRows > 0) {
            
            // --- AJUSTE PARA RESEND ---
            const mailOptions = {
                // Cambiamos process.env.EMAIL_USER por el oficial de Resend
                from: 'onboarding@resend.dev', 
                
                // IMPORTANTE: En modo gratuito/prueba, cámbialo a tu correo de registro
                // para que puedas ver que llega. 
                // Si ya agregaste al empleado en "Audience" en Resend, puedes dejar 'email'.
                to: 'tu_correo_de_registro@gmail.com', 
                
                subject: '¡Registro Aprobado! - Acceso Concedido',
                html: `
                    <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                        <h2 style="color: #28a745;">¡Hola ${nombre_usuario}!</h2>
                        <p>Te informamos que el administrador ha <strong>aprobado tu cuenta</strong>.</p>
                        <p>Ya puedes acceder al sistema con tu nombre de usuario y contraseña.</p>
                        <br>
                        <a href="http://localhost:3000/login" 
                            style="background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
                            Ir al Inicio de Sesión
                        </a>
                        <p style="margin-top: 20px; font-size: 0.8em; color: #666;">
                           Notificación para: ${email} (Enviado vía Resend desde Aruba)
                        </p>
                    </div>
                `
            };

            // Enviamos el correo
            transporter.sendMail(mailOptions)
                .then(() => console.log(`✅ Correo enviado a: ${email}`))
                .catch(err => console.error("❌ Error enviando mail con Resend:", err.message));

            res.json({ success: true, message: "Empleado aprobado y notificación enviada" });

        } else {
            res.status(400).json({ success: false, message: "El usuario no ha verificado su correo todavía" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- RUTA PARA RECHAZAR (ELIMINAR) EMPLEADO ---
app.delete('/api/rechazar-empleado', async (req, res) => {
    const { usuario_id } = req.body;
    const admin_empresa_id = req.session.empresa_id;
    const admin_rol = req.session.role;

    if (!admin_empresa_id || admin_rol !== 'admin') {
        return res.status(403).json({ success: false, message: "No autorizado" });
    }

    try {
        // 1. Buscamos el email del usuario ANTES de borrarlo
        const [empleado] = await db.query(
            "SELECT email, nombre_usuario FROM usuarios WHERE id = ? AND empresa_id = ?", 
            [usuario_id, admin_empresa_id]
        );

        if (empleado.length === 0) {
            return res.status(404).json({ success: false, message: "Solicitud no encontrada" });
        }

        const { email, nombre_usuario } = empleado[0];

        // 2. Ahora sí, eliminamos al usuario de la base de datos
        const sql = `DELETE FROM usuarios WHERE id = ? AND empresa_id = ? AND aprobado_por_admin = 0`;
        const [result] = await db.query(sql, [usuario_id, admin_empresa_id]);

        if (result.affectedRows > 0) {
            
            // 3. ENVIAR CORREO DE RECHAZO
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Actualización sobre tu solicitud de registro',
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #d9534f;">Hola ${nombre_usuario}</h2>
                        <p>Lamentamos informarte que tu solicitud de acceso al sistema ha sido <strong>rechazada</strong> por el administrador.</p>
                        <p>Tus datos han sido eliminados de nuestra lista de espera por seguridad.</p>
                        <p>Si crees que esto es un error, por favor contacta directamente con el encargado de tu sucursal.</p>
                        <br>
                        <p style="color: #888; font-size: 0.8em;">Atentamente,<br>Departamento de Sistemas.</p>
                    </div>
                `
            };

            // Enviamos el mail de forma asíncrona
            transporter.sendMail(mailOptions).catch(err => console.error("Error al enviar correo de rechazo:", err));

            res.json({ success: true, message: "Solicitud rechazada y usuario notificado" });
        } else {
            res.status(400).json({ success: false, message: "No se pudo eliminar la solicitud (quizás ya fue aprobada)" });
        }
    } catch (error) {
        console.error("Error en rechazo:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
app.post('/api/register', async (req, res) => {
    // 1. Extraemos los datos del req.body
    const { nombre_real, email_usuario, nombre_empresa, nombre_usuario, contrasena } = req.body;
    
    // Generamos el token para validación de correo
    const token = crypto.randomBytes(32).toString('hex');

    try {
        // 2. Manejo de Empresa (Aseguramos que la empresa exista)
        await db.query("INSERT IGNORE INTO empresas (nombre_empresa) VALUES (?)", [nombre_empresa]);
        const [empRows] = await db.query("SELECT id FROM empresas WHERE nombre_empresa = ?", [nombre_empresa]);
        
        if (empRows.length === 0) {
            return res.status(400).json({ success: false, message: "Error al crear o encontrar la empresa." });
        }
        const empresaId = empRows[0].id;

        // 3. Hash de contraseña
        const hashPass = await bcrypt.hash(contrasena, 10);

        // 4. SQL INSERT (Ajustado al orden de tu tabla usuarios)
        // Estructura: (nombre_usuario, email, id_personal, contrasena, empresa_id, role, verificado, aprobado_por_admin, token_verificacion)
        const sql = `INSERT INTO usuarios 
                    (nombre_usuario, email, id_personal, contrasena, empresa_id, role, verificado, aprobado_por_admin, token_verificacion) 
                    VALUES (?, ?, ?, ?, ?, 'empleado', 0, 0, ?)`;

        // IMPORTANTE: id_personal lo mapeamos a 'nombre_usuario' (el ID que el usuario elige) 
        // y nombre_usuario de la DB lo mapeamos a 'nombre_real'
        await db.query(sql, [
            nombre_real,      // Va a columna nombre_usuario (Nombre Completo)
            email_usuario,    // Va a columna email
            nombre_usuario,   // Va a columna id_personal (El login ID)
            hashPass,         // Va a columna contrasena
            empresaId,        // Va a columna empresa_id
            token             // Va a columna token_verificacion
        ]);

        // 5. Enviar Correo (Descomenta cuando configures nodemailer)
        // await enviarCorreoVerificacion(email_usuario, token);
        const enlaceVerificacion = `http://localhost:3000/api/verify/${token}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email_usuario, // <--- USAMOS 'email_usuario' PORQUE ASÍ SE LLAMA EN TU REQ.BODY
            subject: 'Confirma tu correo electrónico 📧',
            html: `
                <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2>¡Hola ${nombre_real}!</h2>
                    <p>Gracias por registrarte. Para activar tu cuenta de administrador, haz clic en el botón:</p>
                    <div style="text-align: center;">
                        <a href="${enlaceVerificacion}" 
                           style="background-color: #28a745; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                           Verificar mi cuenta ahora
                        </a>
                    </div>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">
                        Si el botón no funciona, copia este enlace: ${enlaceVerificacion}
                    </p>
                </div>
            `
        };
// Verificación de conexión (Añade esto para probar)
    transporter.verify((error, success) => {
    if (error) {
        console.log("Error en la configuración de correo:", error);
    } else {
        console.log("Servidor de correo listo para enviar mensajes");
    }
});
        // Enviamos el correo realmente
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Registro exitoso. Revisa tu correo para verificar tu cuenta." });

    } catch (error) {
        console.error("Error en registro:", error);
        // Manejo de error si el usuario/email ya existe
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "El ID de usuario o el correo ya están registrados." });
        }
        res.status(500).json({ success: false, message: "Error interno: " + error.message });
    }
});
app.get('/api/verificar-cuenta/:token', async (req, res) => {
    const { token } = req.params;

    try {
        // 1. Buscamos al usuario (usando desestructuración de arreglos para mysql2)
        const [rows] = await db.query(
            'SELECT id, id_personal FROM usuarios WHERE token_verificacion = ?', 
            [token]
        );

        // Si no hay resultados, rows estará vacío
        if (rows.length === 0) {
            return res.status(400).send(`
                <div style="text-align:center; font-family:sans-serif; margin-top:50px; padding:20px;">
                    <h1 style="color:#e63946;">❌ Enlace expirado o inválido</h1>
                    <p>El token de verificación no es correcto o ya fue utilizado.</p>
                    <a href="/login.html" style="color:#1d3557;">Volver al inicio</a>
                </div>
            `);
        }

        const usuario = rows[0];

        // 2. Marcamos como verificado y limpiamos el token
        await db.query(
            'UPDATE usuarios SET verificado = 1, token_verificacion = NULL WHERE id = ?',
            [usuario.id]
        );

        // 3. Respuesta visual amigable
        res.send(`
            <div style="text-align:center; font-family:sans-serif; margin-top:50px; border:1px solid #ddd; display:inline-block; padding:40px; border-radius:10px; width:80%; max-width:500px;">
                <h1 style="color:#28a745;">✅ ¡Correo verificado con éxito!</h1>
                <p>Hola <strong>${usuario.id_personal}</strong>, tu correo ha sido confirmado.</p>
                <p style="background:#f1faee; padding:15px; border-radius:5px; color:#1d3557;">
                    <strong>Paso final:</strong> Tu cuenta está en espera de aprobación por el administrador. 
                    Recibirás un aviso cuando puedas ingresar.
                </p>
                <br>
                <a href="/login.html" style="display:inline-block; background:#1d3557; color:white; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold;">Ir al Inicio de Sesión</a>
            </div>
        `);

    } catch (error) {
        console.error('Error en verificación:', error);
        res.status(500).send("Error interno al procesar la verificación.");
    }
});
app.get('/api/empleados-pendientes', async (req, res) => {
    const admin_empresa_id = req.session.empresa_id;
    const admin_rol = req.session.role;

    // Solo permitimos el acceso si es admin
    if (!admin_empresa_id || admin_rol !== 'admin') {
        return res.status(403).json([]);
    }

    try {
        const sql = `
            SELECT id, nombre_usuario, id_personal, email 
            FROM usuarios 
            WHERE empresa_id = ? AND verificado = 1 AND aprobado_por_admin = 0`;
        
        const [pendientes] = await db.query(sql, [admin_empresa_id]);
        res.json(pendientes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/verify/:token', async (req, res) => {
    const { token } = req.params;

    try {
        // 1. Buscamos al usuario que tenga ese token
        const [rows] = await db.query("SELECT id FROM usuarios WHERE token_verificacion = ?", [token]);

        if (rows.length === 0) {
            return res.status(400).send("<h1>Token inválido o expirado</h1>");
        }

        const usuarioId = rows[0].id;

        // 2. Marcamos como verificado y LIMPIAMOS el token (por seguridad)
        await db.query(
            "UPDATE usuarios SET verificado = 1, token_verificacion = NULL WHERE id = ?", 
            [usuarioId]
        );

        // 3. Redirigimos a una página de éxito o mostramos un mensaje
        res.send(`
            <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                <h1>¡Correo verificado con éxito! 🎉</h1>
                <p>Tu cuenta ahora está pendiente de aprobación por el administrador.</p>
                <p>Te avisaremos por correo cuando puedas iniciar sesión.</p>
                <a href="/login.html">Volver al Inicio</a>
            </div>
        `);

    } catch (error) {
        console.error(error);
        res.status(500).send("Error al verificar el correo");
    }
});
// --- 8. CIERRE DE SESIÓN ---
// Asegúrate de que esta ruta sea POST y coincida con el fetch de common.js
// Ruta GET para cerrar sesión desde cualquier formulario
app.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.error("Error al destruir sesión:", err);
            }
            res.clearCookie('connect.sid'); // Limpia la cookie del navegador
            return res.redirect('/'); // Te manda de vuelta al login
        });
    } else {
        res.redirect('/');
    }
});

// --- RUTA PARA OBTENER LOS DATOS DEL USUARIO LOGUEADO ---
app.get('/api/usuario-actual', (req, res) => {
    if (req.session && req.session.loggedIn) {
        res.json({
            loggedIn: true,
            nombre_usuario: req.session.nombre_usuario,
            role: req.session.role, // Asegúrate de que este nombre sea el mismo que usas en el JS
            rol: req.session.role,  // Agregamos este como "comodín" por si acaso
            empresa_id: req.session.empresa_id
        });
    } else {
        res.status(401).json({ loggedIn: false, message: "No hay sesión activa" });
    }
});

app.get('/api/ingresos-hoy', async (req, res) => {
    const empresa_id = req.session.empresa_id;
    if (!empresa_id) return res.json({ total: 0 });

    try {
        // CURDATE() toma solo la fecha actual ignorando la hora
        const [rows] = await db.query(
            'SELECT SUM(cantidad) as total FROM inventario WHERE empresa_id = ? AND DATE(fecha) = CURDATE()',
            [empresa_id]
        );
        res.json({ total: rows[0].total || 0 });
    } catch (error) {
        console.error("Error contador:", error);
        res.status(500).json({ total: 0 });
    }
});
// Rutas de navegación faltantes
app.get('/averias', (req, res) => {
    res.render('averias');
});

app.post('/api/guardar-averia', async (req, res) => {
    // 1. Extraemos los nombres exactos que vienen de tu formulario
    const { codigo_de_barras, cantidad, descripcion_averia, fecha_averia, estado } = req.body;
    const empresa_id = req.session.empresa_id;
    const usuarioId = req.session.id_personal;

    if (!empresa_id) {
        return res.status(401).json({ success: false, message: "Sesión no válida" });
    }

    // Convertimos a número positivo para evitar errores de signos
    const cantidadNumerica = Math.abs(Number(cantidad)); 

    try {
        // 2. RESTAR del inventario (Asegúrate que la columna sea 'cantidad')
        const sqlRestar = `
            UPDATE inventario 
            SET cantidad = cantidad - ? 
            WHERE codigo_de_barras = ? AND empresa_id = ?`;

        const [resultUpdate] = await db.query(sqlRestar, [cantidadNumerica, codigo_de_barras, empresa_id]);

        if (resultUpdate.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Producto no encontrado en inventario" });
        }

        // 3. REGISTRAR en la tabla de averías (Usando los nombres de tu captura image_ec41e4.png)
        const sqlAveria = `
            INSERT INTO averias 
            (codigo_de_barras, id_personal_usuario, descripcion_averia, fecha_averia, estado, cantidad, empresa_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`;

        await db.query(sqlAveria, [
            codigo_de_barras, 
            usuarioId, 
            descripcion_averia, // Antes era 'motivo' (error)
            fecha_averia,       // Antes era 'fecha' (error)
            estado, 
            cantidadNumerica, 
            empresa_id
        ]);

        res.json({ success: true, message: "Avería registrada y stock actualizado" });

    } catch (e) {
        console.error("Error detallado en avería:", e.message);
        res.status(500).json({ success: false, message: "Error interno: " + e.message });
    }
});
app.get('/subir', (req, res) => {
    if (req.session.loggedIn) res.sendFile(path.join(__dirname, 'public', 'subir.html'));
    else res.redirect('/');
});

app.post('/api/subir-excel', upload.single('excelFile'), (req, res) => {
    // Validaciones rápidas
    if (!req.session.empresa_id) return res.status(401).json({ success: false, message: "Sesión no válida" });
    if (!req.file) return res.status(400).json({ success: false, message: "No se seleccionó ningún archivo" });

    // No leemos el Excel aquí. 
    // Solo respondemos éxito porque el Watcher se encargará en milisegundos.
    res.json({ 
        success: true, 
        message: "Archivo recibido correctamente. El inventario se actualizará en breve." 
    });
});

app.get('/api/historial/:codigo', async (req, res) => {
    const { codigo } = req.params;
    const empresa_id = req.session.empresa_id;

    if (!empresa_id) {
        return res.status(401).json({ success: false, error: "Sesión no válida" });
    }

    // Consulta optimizada: Priorizamos los datos de la tabla 'registros'
    const sql = `
        SELECT 
            r.fecha, 
            r.cantidad, 
            r.precio, 
            r.tipo,
            r.pasillo,
            r.descripcion,
            u.nombre_usuario
        FROM registros r
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        LEFT JOIN inventario i ON r.codigo_de_barras = i.codigo_de_barras AND r.empresa_id = i.empresa_id
        WHERE (r.codigo_de_barras = ? OR r.codigo = ? OR i.codigo = ?) 
        AND r.empresa_id = ?
        ORDER BY r.fecha DESC`;

    try {
        // Añadimos un parámetro más para cubrir la búsqueda por código interno en registros
        const [results] = await db.query(sql, [codigo, codigo, codigo, empresa_id]);
        
        console.log(`✅ Historial real para ${codigo}: ${results.length} registros encontrados.`);
        
        res.json({ success: true, data: results }); 
    } catch (err) {
        console.error("❌ Error al consultar tabla registros:", err.message);
        res.status(500).json({ success: false, error: "Error interno al obtener historial" });
    }
});

app.post('/register', async (req, res) => {
    // 1. Verificar si es admin
    if (!req.session.loggedIn || req.session.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { id_personal, nombre_usuario, contrasena } = req.body;
    const empresa_id = req.session.empresa_id;

    // 2. Validar campos faltantes
    if (!id_personal || !nombre_usuario || !contrasena) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    try {
        // 3. Encriptar la contraseña (¡MUY IMPORTANTE!)
        const hashPass = await bcrypt.hash(contrasena, 10);

        // 4. SQL con los nombres EXACTOS de tus columnas de MySQL
        // Cambié 'usuario' por 'nombre_usuario' y 'password' por 'contrasena'
        const sql = `INSERT INTO usuarios (id_personal, nombre_usuario, contrasena, empresa_id, role) 
                     VALUES (?, ?, ?, ?, ?)`;

        await db.query(sql, [id_personal, nombre_usuario, hashPass, empresa_id, 'usuario']);
        
        res.json({ success: true, message: 'Usuario registrado con éxito' });

    } catch (error) {
        console.error("Error detallado:", error); // Esto te dirá en consola si falta algo más
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'El ID personal ya está registrado' });
        } else {
            res.status(500).json({ success: false, message: 'Error interno: ' + error.message });
        }
    }
});
// Obtener lista de empresas para el formulario de registro
app.get('/api/empresas', async (req, res) => {
    try {
        // Asegúrate de que el nombre de la tabla sea 'empresas'
        const [rows] = await db.query('SELECT id, nombre FROM empresas ORDER BY nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener empresas:", error);
        res.status(500).json({ error: "No se pudieron cargar las empresas" });
    }
});

// server.js (ESTO SÍ VA EN EL SERVIDOR)
app.post('/api/registrar-venta', async (req, res) => {
    // 1. Pedimos una conexión específica del Pool para la transacción
    const connection = await db.getConnection(); 
    
    try {
        await connection.beginTransaction(); 

        // 2. Obtenemos datos del cuerpo y la SESIÓN (Privacidad)
        const { codigo, cantidad } = req.body; 
        const id_personal = req.session.userId; // Tomamos el ID de quien inició sesión
        const empresa_id = req.session.empresa_id;

        if (!empresa_id) throw new Error("Sesión expirada");

        // 3. Insertamos el movimiento (Venta = Cantidad Negativa)
        // Usamos codigo_de_barras para que coincida con tu Excel
        const sql = `
            INSERT INTO inventario (codigo_de_barras, cantidad, id_personal_usuario, empresa_id, fecha) 
            VALUES (?, ?, ?, ?, NOW())`;

        await connection.query(sql, [
            codigo, 
            -Math.abs(cantidad), // Forzamos que sea resta para el historial de ventas
            id_personal, 
            empresa_id
        ]);

        await connection.commit(); 
        res.json({ success: true, message: "Venta registrada y stock actualizado" });

    } catch (error) {
        await connection.rollback(); 
        console.error("Error en venta:", error);
        res.status(500).json({ error: "Error interno al procesar la venta" });
    } finally {
        // 4. SIEMPRE liberamos la conexión de vuelta al pool
        connection.release(); 
    }
});

// server.js
// Ruta unificada para buscar por Barras, Código o Descripción
app.get('/api/productos/buscar-unificado', async (req, res) => {
    const valor = req.query.valor;
    const empresa_id = req.session.empresa_id;

    if (!valor) {
        return res.status(400).json({ success: false, message: "Valor de búsqueda vacío" });
    }

    try {
        // Usamos LIKE con % para que busque "cualquier cosa que contenga el texto"
        // Quitamos el LIMIT 1 para que pueda devolver una LISTA si hay varios
        const query = `
            SELECT id, codigo_de_barras, codigo, descripcion, cantidad, precio, pasillo, fecha 
            FROM inventario 
            WHERE empresa_id = ? 
            AND (
                codigo_de_barras = ? 
                OR codigo = ? 
                OR descripcion LIKE ? 
                OR precio LIKE ?
            )
            ORDER BY descripcion ASC`;

        const busquedaParcial = `%${valor}%`;
        
        // Ejecutamos la consulta usando el pool (db.query)
        const [results] = await db.query(query, [empresa_id, valor, valor, busquedaParcial, busquedaParcial]);

        if (results.length > 0) {
            // Si solo hay uno, podrías enviarlo directo, pero es mejor enviar siempre el array
            res.json({ success: true, products: results, count: results.length });
        } else {
            res.json({ success: false, message: "No se encontraron coincidencias" });
        }
    } catch (err) {
        console.error("Error en búsqueda unificada:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});
app.get('/api/productos', (req, res) => {
    // Usamos SUM para totalizar existencias y GROUP BY para no repetir filas
    const sql = `
        SELECT 
            codigo_de_barras, 
            codigo, 
            descripcion, 
            SUM(cantidad) AS cantidad, 
            MAX(fecha) AS fecha, 
            precio, 
            pasillo 
        FROM inventario 
        GROUP BY codigo_de_barras, codigo, descripcion, precio, pasillo
        ORDER BY fecha DESC`;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
// Ruta para las sugerencias del datalist (Sugerencias en tiempo real)
app.get('/api/productos/sugerencias-global', (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ success: true, suggestions: [] });

    const query = "SELECT id, descripcion, codigo_de_barras FROM inventario WHERE descripcion LIKE ? LIMIT 5";
    db.query(query, [`%${q}%`], (err, results) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, suggestions: results });
    });
});

app.post('/api/admin/setup-full-client', async (req, res) => {
    const { 
        nombre_empresa, rnc_aruba, direccion, telefono, 
        correo_empresa, nombre_dueno, id_personal, contrasena, 
        plan_suscripcion 
    } = req.body;

    try {
        // 1. Insertar en tu tabla 'empresas' con tus columnas exactas
        const qEmpresa = `INSERT INTO empresas 
            (nombre_empresa, rnc_aruba, plan_suscripcion, direccion, telefono, id_personal, nombre_dueno) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.query(qEmpresa, [nombre_empresa, rnc_aruba, plan_suscripcion, direccion, telefono, id_personal, nombre_dueno], async (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'Error al crear empresa: ' + err.message });

            const nuevaEmpresaId = result.insertId;
            const hashedPassword = await bcrypt.hash(contrasena, 10);

            // 2. Crear el Usuario Admin vinculado
            const qUsuario = `INSERT INTO usuarios (nombre_usuario, id_personal, contrasena, role, empresa_id) 
                              VALUES (?, ?, ?, 'admin', ?)`;

            db.query(qUsuario, [nombre_dueno, id_personal, hashedPassword, nuevaEmpresaId], (err2) => {
                if (err2) return res.status(500).json({ success: false, message: 'Usuario no creado' });

                // 3. Enviar Correo con los detalles del plan
                enviarCorreoPlan(correo_empresa, nombre_empresa, plan_suscripcion);

                res.json({ success: true, empresa_id: nuevaEmpresaId });
            });
        });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

app.post('/api/registrar-empresa', async (req, res) => {
    const { nombre, email, plan } = req.body;
    
    const funciones = {
        basico: { inventario: true, averias: false, reportes: false },
        premium: { inventario: true, averias: true, reportes: true }
    };

    try {
        // 1. Guardar en la DB
        await db.query('INSERT INTO empresas (nombre, email, plan) VALUES (?, ?, ?)', [nombre, email, plan]);

        // 2. CREACIÓN FÍSICA DE CARPETAS (La clave para el Watcher y el Widget)
        // Limpiamos el nombre de espacios para evitar problemas en el sistema de archivos
        const nombreCarpeta = nombre.replace(/\s+/g, '_').trim();
        const rutaAutoProcesar = path.join('./auto_procesar', nombreCarpeta);
        const rutaProcesados = path.join('./procesados', nombreCarpeta);

        if (!fs.existsSync(rutaAutoProcesar)) {
            fs.mkdirSync(rutaAutoProcesar, { recursive: true });
        }
        if (!fs.existsSync(rutaProcesados)) {
            fs.mkdirSync(rutaProcesados, { recursive: true });
        }


        // 4. Contenido del correo mejorado
        const funcionesTexto = Object.keys(funciones[plan])
            .filter(k => funciones[plan][k])
            .map(f => `<li>${f.charAt(0).toUpperCase() + f.slice(1)}</li>`)
            .join('');

        const mailOptions = {
  from: '"Aragon Smart Inventories" <tu-correo@gmail.com>',
  to: correoCliente, // La variable del correo que escribiste en el formulario
  subject: '¡Bienvenido a Aragon Smart Inventories! 🚀',
  html: `
    <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
      <h2 style="color: #2563eb;">¡Hola, ${nombreCliente}!</h2>
      <p>Es un gusto saludarte. Tu empresa <strong>${nombreEmpresa}</strong> ha sido registrada con éxito en nuestro sistema.</p>
      <p>A partir de ahora, podrás gestionar tus inventarios de manera inteligente desde cualquier lugar.</p>
      <hr>
      <p style="font-size: 0.9em; color: #555;">Si tienes dudas, responde a este correo. <br> 
      Atentamente, <br> <strong>El equipo de Aragon (Aruba)</strong></p>
    </div>
  `
};

// Enviar el correo
await transporter.sendMail(mailOptions);
        
        console.log(`✅ Empresa ${nombre} registrada y carpetas creadas.`);
        res.json({ success: true, funciones: funciones[plan] });

    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ success: false, message: "Error al registrar empresa" });
    }
});

// Esto es lo que te falta: decirle a Node que sirva la carpeta 'dist'
app.use('/dist', express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// --- ESTO VA EN EL SERVIDOR (server.js) ---


// Ejemplo de uso en tus rutas del servidor:
// app.post('/api/averias', verificarPlan('estandar'), (req, res) => { ... });
// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor de ARAGON corriendo en el puerto ${PORT}`);
});