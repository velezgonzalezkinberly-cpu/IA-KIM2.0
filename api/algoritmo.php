<?php
/**
 * GET api/algoritmo.php?id=3          → un algoritmo por su identificador numérico
 * GET api/algoritmo.php?codigo=ALG-03 → un algoritmo por su código
 *
 * Respuesta 200: { ok, dato:{id,codigo,nombre,clasificacion,descripcion,
 *                  complejidad_temporal,complejidad_espacial,observaciones,fecha_creacion}, generado }
 * 400 parámetro ausente/inválido · 404 no existe
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/api.php';
iniciar_api();

$id     = parametro_entero('id', 1, 4294967295, null);
$codigo = parametro_texto('codigo', 10);

if ($id === null && $codigo === null) {
    responder_error(400, 'parametro_requerido', "Indica 'id' (número) o 'codigo' (por ejemplo ALG-03).");
}
if ($id !== null && $codigo !== null) {
    responder_error(400, 'parametro_invalido', "Usa solo uno: 'id' o 'codigo'.");
}
if ($codigo !== null && !preg_match('/^ALG-[0-9]{2,3}$/i', $codigo)) {
    responder_error(400, 'parametro_invalido', "El código debe tener el formato ALG-01.");
}

try {
    $pdo = conectar();
    if ($id !== null) {
        $consulta = $pdo->prepare('SELECT * FROM algoritmos WHERE id = :id LIMIT 1');
        $consulta->bindValue(':id', $id, PDO::PARAM_INT);
    } else {
        $consulta = $pdo->prepare('SELECT * FROM algoritmos WHERE codigo = :codigo LIMIT 1');
        $consulta->bindValue(':codigo', strtoupper($codigo), PDO::PARAM_STR);
    }
    $consulta->execute();
    $fila = $consulta->fetch();
} catch (Throwable $e) {
    responder_error_bd($e);
}

if (!$fila) {
    responder_error(404, 'no_encontrado', 'No existe un algoritmo con ese identificador.');
}
$fila['id'] = (int)$fila['id'];

responder(200, ['ok' => true, 'dato' => $fila, 'generado' => gmdate('c')]);
