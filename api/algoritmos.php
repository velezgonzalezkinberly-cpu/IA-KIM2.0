<?php
/**
 * GET api/algoritmos.php
 * Lista los algoritmos de búsqueda.
 *
 * Parámetros opcionales (todos por la URL):
 *   q              texto a buscar en el nombre o en el código (máx. 100 caracteres)
 *   clasificacion  clasificación exacta (máx. 80 caracteres)
 *   limite         1 a 100 (por defecto 100)
 *   desplazamiento 0 o más (por defecto 0)
 *
 * Respuesta 200:
 *   { ok, total, cantidad, datos:[{id,codigo,nombre,clasificacion,descripcion}],
 *     clasificaciones:[...], generado }
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/api.php';
iniciar_api();

$q             = parametro_texto('q', 100);
$clasificacion = parametro_texto('clasificacion', 80);
$limite        = parametro_entero('limite', 1, 100, 100);
$desplaz       = parametro_entero('desplazamiento', 0, 1000000, 0);

// Se arma el WHERE solo con condiciones fijas; los valores del usuario van SIEMPRE como parámetros.
$condiciones = [];
$valores     = [];

if ($q !== null) {
    // Se escapan los comodines de LIKE para que "%" o "_" se busquen como texto normal.
    $patron = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $q) . '%';
    $condiciones[] = "(nombre LIKE :q_nombre ESCAPE '!' OR codigo LIKE :q_codigo ESCAPE '!')";
    $valores[':q_nombre'] = $patron;
    $valores[':q_codigo'] = $patron;
}
if ($clasificacion !== null) {
    $condiciones[] = 'clasificacion = :clasificacion';
    $valores[':clasificacion'] = $clasificacion;
}
$where = $condiciones ? ('WHERE ' . implode(' AND ', $condiciones)) : '';

try {
    $pdo = conectar();

    $contar = $pdo->prepare("SELECT COUNT(*) FROM algoritmos $where");
    $contar->execute($valores);
    $total = (int)$contar->fetchColumn();

    $lista = $pdo->prepare(
        "SELECT id, codigo, nombre, clasificacion, descripcion
           FROM algoritmos $where
          ORDER BY id ASC
          LIMIT :limite OFFSET :desplazamiento"
    );
    foreach ($valores as $k => $v) {
        $lista->bindValue($k, $v, PDO::PARAM_STR);
    }
    $lista->bindValue(':limite', $limite, PDO::PARAM_INT);
    $lista->bindValue(':desplazamiento', $desplaz, PDO::PARAM_INT);
    $lista->execute();
    $datos = $lista->fetchAll();
    foreach ($datos as &$fila) {
        $fila['id'] = (int)$fila['id'];
    }
    unset($fila);

    // Todas las clasificaciones (sin filtrar) para llenar el menú desplegable.
    $clasificaciones = $pdo->query('SELECT DISTINCT clasificacion FROM algoritmos ORDER BY clasificacion')
                           ->fetchAll(PDO::FETCH_COLUMN);
} catch (Throwable $e) {
    responder_error_bd($e);
}

responder(200, [
    'ok'              => true,
    'total'           => $total,
    'cantidad'        => count($datos),
    'datos'           => $datos,
    'clasificaciones' => $clasificaciones,
    'generado'        => gmdate('c'),
]);
