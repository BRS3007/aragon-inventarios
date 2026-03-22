<?php
// ===================================================================
// Bloque de Inicio: Configuración de respuesta y manejo de errores JSON
// ===================================================================

// Permite solicitudes desde http://localhost:3000
header('Access-Control-Allow-Origin: http://localhost:3000');
// Opcionalmente, puedes permitir todos los orígenes con un comodín (solo para desarrollo):
// header('Access-Control-Allow-Origin: *'); 
// También puede ser necesario añadir otros headers si usas métodos POST/PUT/DELETE
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Max-Age: 86400'); // Cachea la respuesta OPTIONS por un día

// Detecta si la solicitud es OPTIONS (la preflight request del navegador)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    // Responde con éxito (código 200) y termina el script
    http_response_code(200);
    exit(); 
}
// 1. Establecer el tipo de respuesta a JSON al inicio de todo
header('Content-Type: application/json');
// header('Access-Control-Allow-Origin: *'); // Descomentar si tienes problemas de CORS

// Función de utilidad para manejar la respuesta de error en formato JSON
function sendError($message) {
    echo json_encode(['success' => false, 'error' => $message]);
    exit();
}
require_once __DIR__ . '/../vendor/autoload.php';

// 2. Verificar el autoload de PhpSpreadsheet (Carga la librería Excel)
// La ruta 'vendor/autoload.php' sube de 'public' y entra en 'vendor'.
$autoload_path = __DIR__ . '/../vendor/autoload.php';
if (!file_exists($autoload_path)) {
    sendError("Error interno: No se encuentra 'vendor/autoload.php'. Ejecute 'composer install' en la raíz del proyecto.");
}
require $autoload_path;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date; // Para la conversión de fechas de Excel

// 3. CONFIGURACIÓN DE LA BASE DE DATOS - ¡CORREGIDO!
$servername = "127.0.0.1";
$username = "root"; // Tu usuario de MySQL
$password = "Teddy30"; // <--- ¡IMPORTANTE! Reemplaza con tu contraseña
$dbname = "sistema_login"; // <--- Base de Datos Correcta
$tablename = "inventario"; // <--- Tabla Correcta

// 4. ESTABLECER CONEXIÓN Y MANEJAR FALLOS
$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    sendError("Error de conexión a la base de datos: " . $conn->connect_error);
}

// ===================================================================
// Bloque de Procesamiento de Petición y Archivo
// ===================================================================

// 5. VERIFICAR ARCHIVO SUBIDO Y MÉTODO
if ($_SERVER["REQUEST_METHOD"] !== "POST" || !isset($_FILES["excelFile"])) {
    sendError("Solicitud no válida o archivo no enviado.");
}

$file = $_FILES["excelFile"];

if ($file["error"] !== UPLOAD_ERR_OK) {
    sendError("Error al subir el archivo. Código de error: " . $file["error"]);
}

// 6. PROCESAR EL ARCHIVO EXCEL
try {
    $inputFileName = $file["tmp_name"];
    $spreadsheet = IOFactory::load($inputFileName);
    $sheet = $spreadsheet->getActiveSheet();
    $highestRow = $sheet->getHighestRow();

    $inserted_rows = 0;
    
    // Asumiendo que la fila 1 es el encabezado, comenzamos en la fila 2
    for ($row = 2; $row <= $highestRow; $row++) {
        // Mapeo de columnas del Excel a la tabla 'inventario':
        // Columna A (ID) se omite, ya que es autoincremental
        $codigo_de_barras = $sheet->getCell('A' . $row)->getValue(); 
        $codigo = $sheet->getCell('B' . $row)->getValue();
        $descripcion = $sheet->getCell('C' . $row)->getValue();
        $cantidad = $sheet->getCell('D' . $row)->getValue();
        $fecha = $sheet->getCell('E' . $row)->getValue(); 
        $precio = $sheet->getCell('F' . $row)->getValue();
        $pasillo = $sheet->getCell('G' . $row)->getValue();
        
        // Sanear datos (IMPORTANTE: previene inyecciones SQL)
        $codigo_de_barras = $conn->real_escape_string($codigo_de_barras);
        $codigo = $conn->real_escape_string($codigo);
        $descripcion = $conn->real_escape_string($descripcion);
        $pasillo = $conn->real_escape_string($pasillo);

        // Conversión de datos
        $cantidad = is_numeric($cantidad) ? (int)$cantidad : 0;
        $precio = is_numeric($precio) ? (float)$precio : 0.00;

        // Conversión de fecha de formato Excel (número de serie) a YYYY-MM-DD
        if (is_numeric($fecha) && $fecha > 0) {
             $fecha = Date::excelToDateTimeObject($fecha)->format('Y-m-d');
        } else {
             $fecha = date('Y-m-d'); // Fecha actual como fallback
        }

        // 7. CONSTRUIR Y EJECUTAR LA CONSULTA SQL
        $sql = "INSERT INTO $tablename (codigo_de_barras, codigo, descripcion, cantidad, fecha, precio, pasillo, id_personal_usuario) 
                VALUES ('$codigo_de_barras', '$codigo', '$descripcion', $cantidad, '$fecha', $precio, '$pasillo', NULL)"; 
        
        if ($conn->query($sql) !== TRUE) {
            // Si una fila falla, devolvemos el error SQL detallado y detenemos.
            sendError("Error al insertar en la tabla $tablename (Fila $row). SQL Error: " . $conn->error);
        }
        
        $inserted_rows++;
    }

    $conn->close();

    // 8. RESPUESTA DE ÉXITO FINAL
    echo json_encode(['success' => true, 'message' => "Subida exitosa. Se insertaron $inserted_rows filas."]);

} catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $e) {
    sendError("Error de lectura del archivo Excel: " . $e->getMessage());
} catch (Exception $e) {
    sendError("Error general al procesar: " . $e->getMessage());
}

?>