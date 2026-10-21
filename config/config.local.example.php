<?php
/**
 * Copia este archivo como  config/config.local.php  y escribe tus datos.
 * config.local.php está en .gitignore y config/ tiene un .htaccess que
 * impide abrirlo desde el navegador. NUNCA subas tus claves a GitHub.
 *
 * Si prefieres variables de entorno (DB_HOST, DB_NAME, DB_USER, DB_PASS),
 * no necesitas este archivo.
 */
return [
    'host' => '127.0.0.1',                 // en hosting compartido suele ser 'localhost'
    'port' => 3306,
    'name' => 'bd_algoritmos_busqueda',    // en hosting compartido suele llevar prefijo: cuenta_bd_algoritmos
    'user' => 'USUARIO_DE_MYSQL',
    'pass' => 'CONTRASEÑA_DE_MYSQL',
];
