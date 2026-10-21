<?php
/**
 * config/database.php · Configuración y conexión PDO a MySQL/MariaDB.
 *
 * Orden en que se buscan las credenciales (gana la primera que exista):
 *   1) Variables de entorno:  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
 *      (recomendado en producción; en Apache: SetEnv en la configuración
 *       del sitio; en PHP-FPM: env[DB_HOST] = ... en el pool).
 *   2) Archivo config/config.local.php (NO se sube a repositorios; se crea
 *      copiando config.local.example.php). Úsalo en hosting compartido.
 *   3) Solo para desarrollo local con XAMPP: si no hay nada de lo anterior,
 *      la petición viene del propio equipo (127.0.0.1 / ::1) y APP_ENV no es
 *      "production", se usa root sin contraseña (valores por defecto de XAMPP).
 *
 * Este archivo NO contiene contraseñas reales.
 */
declare(strict_types=1);

/** Lee una variable de entorno (funciona con mod_php, PHP-FPM y SetEnv). */
function leer_env(string $nombre): ?string
{
    $valor = $_SERVER[$nombre] ?? $_ENV[$nombre] ?? getenv($nombre);
    return ($valor === false || $valor === null || $valor === '') ? null : (string)$valor;
}

/** ¿La petición viene del mismo equipo? (REMOTE_ADDR no se puede falsificar con cabeceras). */
function cliente_es_local(): bool
{
    return in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
}

/** ¿Estamos en producción? */
function es_produccion(): bool
{
    return strtolower(leer_env('APP_ENV') ?? '') === 'production';
}

/** Devuelve la configuración de la base de datos o null si no está configurada. */
function configuracion_bd(): ?array
{
    $cfg = [
        'host' => leer_env('DB_HOST'),
        'port' => leer_env('DB_PORT'),
        'name' => leer_env('DB_NAME'),
        'user' => leer_env('DB_USER'),
        'pass' => leer_env('DB_PASS'),
    ];

    // 2) Archivo local (completa lo que no venga por variables de entorno).
    $archivo = __DIR__ . '/config.local.php';
    if (is_file($archivo)) {
        $local = require $archivo;
        if (is_array($local)) {
            foreach (['host', 'port', 'name', 'user', 'pass'] as $k) {
                if ($cfg[$k] === null && isset($local[$k])) {
                    $cfg[$k] = (string)$local[$k];
                }
            }
        }
    }

    // 3) Valores por defecto de XAMPP, solo en desarrollo y solo desde el propio equipo.
    if ($cfg['user'] === null && $cfg['pass'] === null && !es_produccion() && cliente_es_local()) {
        $cfg['user'] = 'root';
        $cfg['pass'] = '';
    }

    if ($cfg['user'] === null) {
        return null; // Sin usuario no hay configuración utilizable.
    }

    return [
        'host' => $cfg['host'] ?? '127.0.0.1',   // 127.0.0.1 evita problemas de "localhost"/IPv6 en Windows.
        'port' => (int)($cfg['port'] ?? 3306),
        'name' => $cfg['name'] ?? 'bd_algoritmos_busqueda',
        'user' => $cfg['user'],
        'pass' => $cfg['pass'] ?? '',
    ];
}

/**
 * Abre la conexión PDO. Lanza PDOException si falla, o RuntimeException si no
 * hay credenciales configuradas. Quien la llame decide qué mostrar al usuario.
 */
function conectar(): PDO
{
    $cfg = configuracion_bd();
    if ($cfg === null) {
        throw new RuntimeException('Base de datos sin configurar', 9001);
    }

    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $cfg['host'], $cfg['port'], $cfg['name']);

    return new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,   // consultas preparadas reales en el servidor
        PDO::ATTR_TIMEOUT            => 5,
    ]);
}
