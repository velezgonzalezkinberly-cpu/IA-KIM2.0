<?php
/**
 * config/api.php · Utilidades comunes de los endpoints JSON.
 * Aquí se centralizan: cabeceras HTTP, CORS, validación de método, respuestas
 * y traducción de errores de la base de datos a mensajes seguros.
 */
declare(strict_types=1);

require_once __DIR__ . '/database.php';

// Nunca mostrar errores internos al visitante; se registran en el log del servidor.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

/** Envía una respuesta JSON y termina. */
function responder(int $estado, array $cuerpo): never
{
    http_response_code($estado);
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Respuesta de error con estructura uniforme. */
function responder_error(int $estado, string $codigo, string $mensaje, array $extra = []): never
{
    responder($estado, ['ok' => false, 'error' => ['codigo' => $codigo, 'mensaje' => $mensaje] + $extra]);
}

/** Cabeceras comunes. Se llama al inicio de cada endpoint. */
function iniciar_api(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    // "no-cache" = el navegador/proxy puede guardarla pero DEBE revalidar: nunca queda obsoleta en silencio.
    header('Cache-Control: no-cache, must-revalidate');

    // Errores no capturados: respuesta genérica, detalle solo al log.
    set_exception_handler(function (Throwable $t): void {
        error_log('[api] Excepción no controlada: ' . get_class($t) . ' en ' . basename($t->getFile()) . ':' . $t->getLine());
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }
        responder_error(500, 'error_interno', 'Ocurrió un error inesperado en el servidor.');
    });

    manejar_cors();

    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($metodo === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if (!in_array($metodo, ['GET', 'HEAD'], true)) {
        header('Allow: GET, HEAD, OPTIONS');
        responder_error(405, 'metodo_no_permitido', 'Esta API solo permite consultas (GET).');
    }
}

/**
 * CORS: solo si el frontend vive en OTRO dominio. Define ALLOWED_ORIGINS con los
 * orígenes permitidos separados por comas, p. ej. "https://miescuela.example".
 * Si no se define, no se envía ninguna cabecera CORS (solo mismo origen).
 */
function manejar_cors(): void
{
    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
    $permitidos = array_filter(array_map('trim', explode(',', leer_env('ALLOWED_ORIGINS') ?? '')));
    if ($origen === '' || !$permitidos) {
        return;
    }
    header('Vary: Origin');
    if (in_array($origen, $permitidos, true)) {
        header('Access-Control-Allow-Origin: ' . $origen);
        header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
        header('Access-Control-Allow-Headers: Accept');
        header('Access-Control-Max-Age: 86400');
    }
}

/** Traduce una excepción de BD a una respuesta JSON segura. */
function responder_error_bd(Throwable $e): never
{
    $codigo_mysql = ($e instanceof PDOException && isset($e->errorInfo[1])) ? (int)$e->errorInfo[1] : (int)$e->getCode();
    error_log('[api] Error de BD (' . $codigo_mysql . '): ' . $e->getMessage());

    // Solo desde el propio equipo y fuera de producción se añade una pista técnica.
    $extra = (!es_produccion() && cliente_es_local()) ? ['detalle_local' => recortar_utf8($e->getMessage(), 300)] : [];

    if ($codigo_mysql === 9001) {
        responder_error(503, 'servicio_sin_configurar', 'El servidor todavía no tiene configurada la base de datos.', $extra);
    }
    if (in_array($codigo_mysql, [1049, 1146], true)) {
        responder_error(503, 'base_no_instalada', 'La base de datos de algoritmos aún no está instalada en el servidor.', $extra);
    }
    if (in_array($codigo_mysql, [2002, 2003, 2006, 2013, 1040, 1044, 1045, 1698], true)) {
        responder_error(503, 'servicio_no_disponible', 'No se pudo conectar con la base de datos. Inténtalo de nuevo en unos minutos.', $extra);
    }
    responder_error(500, 'error_interno', 'Ocurrió un error al consultar la información.', $extra);
}

/** Longitud en caracteres UTF-8 (no depende de la extensión mbstring, que algunos hostings no activan). */
function longitud_utf8(string $texto): int
{
    return function_exists('mb_strlen') ? mb_strlen($texto, 'UTF-8') : (int)preg_match_all('/./su', $texto);
}

/** Recorta un texto UTF-8 sin cortar a la mitad un carácter. */
function recortar_utf8(string $texto, int $max): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($texto, 0, $max, 'UTF-8');
    }
    preg_match('/^.{0,' . $max . '}/su', $texto, $m);
    return $m[0] ?? '';
}

/** Lee un parámetro de texto de la URL. Devuelve null si no vino; corta con 400 si es inválido. */
function parametro_texto(string $nombre, int $max): ?string
{
    if (!isset($_GET[$nombre])) {
        return null;
    }
    $v = $_GET[$nombre];
    if (!is_string($v)) {
        responder_error(400, 'parametro_invalido', "El parámetro '$nombre' debe ser un texto.");
    }
    // Primero se validan los caracteres (trim() quitaría un byte nulo y lo ocultaría).
    if (!preg_match('//u', $v) || preg_match('/[\x00-\x1F\x7F]/u', $v)) {
        responder_error(400, 'parametro_invalido', "El parámetro '$nombre' contiene caracteres no válidos.");
    }
    $v = trim($v);
    if ($v === '') {
        return null;
    }
    if (longitud_utf8($v) > $max) {
        responder_error(400, 'parametro_invalido', "El parámetro '$nombre' no puede superar $max caracteres.");
    }
    return $v;
}

/** Lee un entero positivo/cero de la URL con rango. */
function parametro_entero(string $nombre, int $min, int $max, ?int $defecto = null): ?int
{
    if (!isset($_GET[$nombre]) || $_GET[$nombre] === '') {
        return $defecto;
    }
    $v = $_GET[$nombre];
    if (!is_string($v) || !ctype_digit($v) || strlen($v) > 10 || (int)$v < $min || (int)$v > $max) {
        responder_error(400, 'parametro_invalido', "El parámetro '$nombre' debe ser un número entre $min y $max.");
    }
    return (int)$v;
}
