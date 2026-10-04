<?php
// Aplicación para AGREGAR información (INSERT) a la tabla glosario.
require "conexion.php";

$errores = [];
$nombre = $definicion = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nombre     = trim($_POST['nombre'] ?? '');
    $definicion = trim($_POST['definicion'] ?? '');
    $rutaImagen = "";

    // ---- Validaciones ----
    if ($nombre === '' || mb_strlen($nombre) > 120) {
        $errores[] = "El nombre es obligatorio (máximo 120 caracteres).";
    }
    if (mb_strlen($definicion) < 20) {
        $errores[] = "La definición debe tener al menos 20 caracteres.";
    }

    // ---- Imagen (opcional): solo JPG, PNG o WEBP de hasta 3 MB ----
    if (!empty($_FILES['imagen']['name'])) {
        $archivo = $_FILES['imagen'];
        $permitidos = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $mime = $archivo['error'] === UPLOAD_ERR_OK ? mime_content_type($archivo['tmp_name']) : '';

        if ($archivo['error'] !== UPLOAD_ERR_OK) {
            $errores[] = "No se pudo subir la imagen (código " . (int)$archivo['error'] . ").";
        } elseif (!isset($permitidos[$mime])) {
            $errores[] = "La imagen debe ser JPG, PNG o WEBP.";
        } elseif ($archivo['size'] > 3 * 1024 * 1024) {
            $errores[] = "La imagen pesa más de 3 MB.";
        } else {
            $nuevoNombre = "termino-" . date("Ymd-His") . "-" . bin2hex(random_bytes(3)) . "." . $permitidos[$mime];
            if (move_uploaded_file($archivo['tmp_name'], __DIR__ . "/../imagenes/glosario/" . $nuevoNombre)) {
                $rutaImagen = "imagenes/glosario/" . $nuevoNombre;
            } else {
                $errores[] = "No pude guardar la imagen en la carpeta imagenes/glosario/.";
            }
        }
    }

    // ---- INSERT con consulta preparada (evita inyección SQL) ----
    if (!$errores) {
        $insertar = $pdo->prepare("INSERT INTO glosario (nombre, definicion, imagen) VALUES (:nombre, :definicion, :imagen)");
        $insertar->execute([':nombre' => $nombre, ':definicion' => $definicion, ':imagen' => $rutaImagen]);
        header("Location: index.php?ok=1");
        exit;
    }
}

$titulo = "Agregar término";
$pagina = "agregar";
require "encabezado.php";
?>
        <section class="banner">
            <div class="contenedor">
                <svg class="icono-banner" viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
                    <circle cx="32" cy="32" r="24"/><path d="M32 20v24M20 32h24"/>
                </svg>
                <div>
                    <h2>Agregar un término al glosario</h2>
                    <p>Escribe el concepto, su definición y, si quieres, una imagen. Se guarda en la base de datos.</p>
                </div>
            </div>
        </section>

        <section class="seccion">
            <?php if ($errores): ?>
                <div class="aviso error"><strong>Revisa lo siguiente:</strong>
                    <ul><?php foreach ($errores as $m): ?><li><?= e($m) ?></li><?php endforeach; ?></ul>
                </div>
            <?php endif; ?>

            <form class="formulario" method="post" enctype="multipart/form-data" novalidate>
                <div class="campo">
                    <label for="nombre">Nombre del concepto</label>
                    <input type="text" id="nombre" name="nombre" maxlength="120" required value="<?= e($nombre) ?>" placeholder="Ej. Algoritmo">
                </div>
                <div class="campo">
                    <label for="definicion">Definición</label>
                    <textarea id="definicion" name="definicion" required placeholder="Explica el concepto con tus propias palabras…"><?= e($definicion) ?></textarea>
                    <small>Mínimo 20 caracteres.</small>
                </div>
                <div class="campo">
                    <label for="imagen">Imagen del concepto (opcional)</label>
                    <input type="file" id="imagen" name="imagen" accept="image/jpeg,image/png,image/webp">
                    <small>JPG, PNG o WEBP · máximo 3 MB.</small>
                </div>
                <div class="acciones-form">
                    <button class="boton" type="submit">💾 Guardar en la base de datos</button>
                    <a class="boton suave" href="index.php">Cancelar</a>
                </div>
            </form>
        </section>
<?php require "pie.php"; ?>
