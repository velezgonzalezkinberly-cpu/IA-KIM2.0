<?php
// Conexión a la base de datos con PDO (configuración por defecto de XAMPP).
$servidor = "localhost";
$base     = "ia_glosario";
$usuario  = "root";
$clave    = "";            // En XAMPP el usuario root no tiene contraseña.

try {
    $pdo = new PDO(
        "mysql:host=$servidor;dbname=$base;charset=utf8mb4",
        $usuario,
        $clave,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    die("<p style='font-family:sans-serif;padding:2rem'>No pude conectarme a la base de datos <strong>ia_glosario</strong>.<br>
         Enciende Apache y MySQL en XAMPP e importa <code>sql/glosario.sql</code> en phpMyAdmin.</p>");
}

// Función corta para escapar texto antes de mostrarlo en HTML.
function e($texto) {
    return htmlspecialchars((string)$texto, ENT_QUOTES, 'UTF-8');
}
