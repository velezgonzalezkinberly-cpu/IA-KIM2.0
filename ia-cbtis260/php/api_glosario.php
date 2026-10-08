<?php
// Devuelve los conceptos guardados en MySQL en formato JSON para el glosario de la PWA.
require_once __DIR__ . '/conexion.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
try {
    $consulta = $pdo->query('SELECT id, nombre, definicion, imagen FROM glosario ORDER BY id ASC');
    echo json_encode($consulta->fetchAll(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo consultar el glosario.']);
}
