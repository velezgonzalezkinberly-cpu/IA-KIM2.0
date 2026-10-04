<?php
// Lista el glosario leyendo los registros directamente de MySQL.
require "conexion.php";

$buscar = trim($_GET['q'] ?? '');
if ($buscar !== '') {
    $consulta = $pdo->prepare("SELECT * FROM glosario WHERE nombre LIKE :q OR definicion LIKE :q ORDER BY id");
    $consulta->execute([':q' => "%$buscar%"]);
} else {
    $consulta = $pdo->query("SELECT * FROM glosario ORDER BY id");
}
$terminos = $consulta->fetchAll();
$total = (int)$pdo->query("SELECT COUNT(*) FROM glosario")->fetchColumn();

$titulo = "Glosario (base de datos)";
$pagina = "lista";
require "encabezado.php";
?>
        <section class="banner">
            <div class="contenedor">
                <svg class="icono-banner" viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round">
                    <ellipse cx="32" cy="16" rx="18" ry="7"/><path d="M14 16v32c0 4 8 7 18 7s18-3 18-7V16"/><path d="M14 32c0 4 8 7 18 7s18-3 18-7"/>
                </svg>
                <div>
                    <h2>Glosario guardado en MySQL</h2>
                    <p>Estos <?= $total ?> registros salen de la tabla <code>glosario</code> de la base de datos <code>ia_glosario</code>.</p>
                </div>
            </div>
        </section>

        <section class="seccion">
            <?php if (isset($_GET['ok'])): ?>
                <div class="aviso ok">✅ ¡Término agregado correctamente a la base de datos!</div>
            <?php endif; ?>

            <form class="glo-herramientas" method="get">
                <label class="glo-buscar">
                    <span aria-hidden="true">🔎</span>
                    <input type="search" name="q" value="<?= e($buscar) ?>" placeholder="Buscar en la base de datos…">
                </label>
                <button class="boton suave" type="submit">Buscar</button>
                <a class="boton" href="agregar.php">＋ Agregar término</a>
            </form>

            <p class="glo-contador"><?= count($terminos) ?> de <?= $total ?> términos</p>

            <?php if (!$terminos): ?>
                <p class="glo-vacio">No hay resultados para “<?= e($buscar) ?>”.</p>
            <?php else: ?>
            <div class="glo-tabla-caja">
                <table class="glo-tabla">
                    <thead><tr><th>ID</th><th>Nombre</th><th>Definición</th><th>Imagen</th></tr></thead>
                    <tbody>
                    <?php foreach ($terminos as $t): ?>
                        <tr>
                            <td><?= (int)$t['id'] ?></td>
                            <td><strong><?= e($t['nombre']) ?></strong></td>
                            <td><?= e($t['definicion']) ?></td>
                            <td><?php if ($t['imagen']): ?><img src="<?= e($t['imagen']) ?>" alt="<?= e($t['nombre']) ?>"><?php endif; ?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php endif; ?>
        </section>
<?php require "pie.php"; ?>
