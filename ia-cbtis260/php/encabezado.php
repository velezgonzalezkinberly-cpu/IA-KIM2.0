<?php /* Encabezado compartido de la aplicación PHP (mismo diseño que la PWA). */ ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($titulo ?? 'Glosario') ?> | Inteligencia Artificial · CBTIS 260</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../estilos/estilos.css">
    <link rel="stylesheet" href="../estilos/escuchar.css">
    <link rel="stylesheet" href="../estilos/glosario.css">
    <meta name="theme-color" content="#241242">
    <link rel="icon" href="../imagenes/logo-cbtis260.png">
</head>
<body>
    <header>
        <div class="encabezado">
            <img class="logo-marca" src="../imagenes/logo-cbtis260.png" alt="Logo CBTIS 260" width="68" height="68">
            <div>
                <h1>Inteligencia Artificial</h1>
                <p class="subt">Centro de Bachillerato Tecnológico Industrial y de Servicios No. 260</p>
                <p class="lema">Educación tecnológica para transformar el futuro</p>
            </div>
        </div>
        <nav>
            <input type="checkbox" id="nav-toggle" class="nav-toggle">
            <label for="nav-toggle" class="hamburger">☰ Menú</label>
            <div class="nav-lista">
                <a href="../index.html">🏠 Inicio</a>
                <a href="index.php" class="<?= ($pagina ?? '') === 'lista' ? 'activo' : '' ?>">🗄️ Glosario (BD)</a>
                <a href="agregar.php" class="<?= ($pagina ?? '') === 'agregar' ? 'activo' : '' ?>">＋ Agregar término</a>
                <a href="../paginas/glosario.html">📚 Glosario de la PWA</a>
            </div>
        </nav>
    </header>
    <main>
