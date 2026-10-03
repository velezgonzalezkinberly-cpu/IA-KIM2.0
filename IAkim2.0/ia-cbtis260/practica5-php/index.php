<?php
include "conexion.php";
$msg = "";
if ($_SERVER["REQUEST_METHOD"] === "POST") {
  $nombre = trim($_POST["nombre"]); $def = trim($_POST["definicion"]); $ruta = "";
  if (isset($_FILES["imagen"]) && $_FILES["imagen"]["error"] === 0) {
    $ext = strtolower(pathinfo($_FILES["imagen"]["name"], PATHINFO_EXTENSION));
    if (in_array($ext, ["jpg","jpeg","png","gif","webp"])) {
      if (!is_dir("imagenes")) mkdir("imagenes");
      $ruta = "imagenes/" . uniqid("c_") . "." . $ext;
      move_uploaded_file($_FILES["imagen"]["tmp_name"], $ruta);
    }
  }
  if ($nombre && $def && $ruta) {
    $st = $conexion->prepare("INSERT INTO glosario (nombre, definicion, imagen) VALUES (?,?,?)");
    $st->bind_param("sss", $nombre, $def, $ruta); $st->execute();
    $msg = "✅ Concepto agregado correctamente";
  } else { $msg = "⚠️ Llena todos los campos y sube una imagen válida"; }
}
$res = $conexion->query("SELECT * FROM glosario ORDER BY id");
?>
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Glosario IA - Base de datos</title>
<style>body{font-family:Arial;background:#160a2c;color:#fff;margin:0;padding:20px}form,table{max-width:900px;margin:15px auto;background:#2a1650;padding:18px;border-radius:12px}
input,textarea{width:100%;padding:10px;margin:6px 0 12px;border-radius:8px;border:0}button{background:#a855f7;color:#fff;border:0;padding:12px 22px;border-radius:20px;cursor:pointer}
table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #ffffff33;text-align:left}img{width:90px;border-radius:6px}</style></head><body>
<h1 style="text-align:center">📚 Glosario de IA — Agregar concepto</h1>
<form method="post" enctype="multipart/form-data"><p><?= $msg ?></p>
<label>Nombre del concepto</label><input name="nombre" required>
<label>Definición</label><textarea name="definicion" rows="4" required></textarea>
<label>Imagen</label><input type="file" name="imagen" accept="image/*" required>
<button type="submit">Guardar</button></form>
<table><tr><th>ID</th><th>Nombre</th><th>Definición</th><th>Imagen</th></tr>
<?php while ($f = $res->fetch_assoc()): ?>
<tr><td><?= $f["id"] ?></td><td><?= htmlspecialchars($f["nombre"]) ?></td><td><?= htmlspecialchars($f["definicion"]) ?></td><td><img src="<?= htmlspecialchars($f["imagen"]) ?>"></td></tr>
<?php endwhile; ?></table></body></html>
