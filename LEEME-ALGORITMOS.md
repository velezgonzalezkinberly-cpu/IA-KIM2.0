# Algoritmos de búsqueda: MySQL + PHP + PWA

Nueva sección de la PWA **IA · CBTIS 260**. Los datos viven en MySQL (`bd_algoritmos_busqueda`), una API en PHP (PDO) los entrega en JSON y la PWA los muestra en la opción **🔎 Algoritmos de búsqueda** del menú.

## 1. Diagnóstico del proyecto original

| Aspecto | Hallazgo |
|---|---|
| Tecnología | HTML + CSS + JavaScript sin framework; PWA con `manifest.json` y `service-worker.js`; mini-app PHP/MySQL en `php/` (glosario). |
| Navegación | Menú repetido en cada HTML (`index.html` y `paginas/*.html`) y en `php/encabezado.php`. |
| Estilos | `estilos/estilos.css` con variables (`--ink`, `--teal`, `--amber`…), fuentes Fraunces + Inter. Se reutilizaron tal cual. |
| Caché | 5 cachés. La carpeta `php/` no se interceptaba. |
| **Problema encontrado** | Los `.js` estaban en `js/` y `offline.html` en `paginas/`, pero los HTML, `pwa.js`, `modelo.js` y el service worker los seguían buscando en la raíz. Con esas rutas `cache.addAll()` falla (404) y **el service worker nunca se instalaba**. Se corrigieron (ver sección 8). |

## 2. Arquitectura

```
Navegador (PWA)                 Servidor PHP                    MySQL
paginas/algoritmos.html
js/algoritmos.js  --fetch-->  api/algoritmos.php  --PDO-->  bd_algoritmos_busqueda
                              api/algoritmo.php             └ tabla algoritmos
        ^                       config/database.php (conexión)
        |                       config/api.php (cabeceras, CORS, validación, errores)
service-worker.js (caché de la API, método 6)
```

### Archivos nuevos
| Archivo | Para qué |
|---|---|
| `sql/bd_algoritmos_busqueda.sql` | Crea BD, tabla e inserta 14 algoritmos (se puede ejecutar varias veces). |
| `config/database.php` | Conexión PDO. Sin contraseñas en el código. |
| `config/api.php` | Cabeceras HTTP, CORS, validación de parámetros, respuestas y errores seguros. |
| `config/config.local.example.php` | Plantilla para tus credenciales (se copia como `config.local.php`). |
| `api/algoritmos.php` | Lista, búsqueda por nombre/código y filtro por clasificación. |
| `api/algoritmo.php` | Un algoritmo por `id` o por `codigo`. |
| `paginas/algoritmos.html`, `estilos/algoritmos.css`, `js/algoritmos.js` | Vista de la PWA. |
| `pruebas/probar_api.py`, `pruebas/probar_navegador.py` | Pruebas reproducibles. |
| `.gitignore`, `config/.htaccess`, `sql/.htaccess` | Protegen credenciales y carpetas internas. |

## 3. La base de datos

Tabla `algoritmos`: `id` (PK autoincremental), `codigo` (único, formato `ALG-01`), `nombre` (único), `clasificacion` (con índice), `descripcion`, `complejidad_temporal`, `complejidad_espacial`, `observaciones`, `fecha_creacion`. Motor InnoDB, `utf8mb4` / `utf8mb4_spanish_ci` (la búsqueda ignora mayúsculas y acentos: «busqueda» encuentra «Búsqueda»).

**Registros:** los 12 de tu tabla de Word (ALG-01 a ALG-12, con tus códigos y nombres) más **Recocido simulado (ALG-13)** y **Búsqueda de haz local (ALG-14)**, que pedía el documento de requisitos y no estaban en el Word.
**«Búsqueda de costo mínimo»** no se agregó aparte: es el mismo algoritmo que la búsqueda de costo uniforme (ALG-08), y duplicarlo iría contra el requisito de no repetir algoritmos. Queda explicado en sus observaciones.
Algunas clasificaciones difieren un poco del Word para unificarlas con las del documento de requisitos (p. ej. «Por dispersión» → «Búsqueda basada en dispersión (hashing)»). «Búsqueda por intervalos» (exponencial) se conservó porque así la pusiste. Si tu profesor exige el texto exacto del Word, basta editar la columna `clasificacion` en phpMyAdmin.

## 4. Instalación local (XAMPP en Windows)

1. Copia la carpeta del proyecto a `C:\xampp\htdocs\ia-cbtis260`.
2. En el panel de XAMPP enciende **Apache** y **MySQL**.
3. Abre `http://localhost/phpmyadmin` → pestaña **Importar** → elige `sql/bd_algoritmos_busqueda.sql` → **Importar** (o pestaña **SQL**, pega el contenido y **Continuar**).
4. Comprueba la API: `http://localhost/ia-cbtis260/api/algoritmos.php` debe mostrar JSON con 14 registros.
5. Abre `http://localhost/ia-cbtis260/` → menú **🔎 Algoritmos de búsqueda**.

No necesitas configurar credenciales en XAMPP: si no existe `config.local.php` ni variables de entorno, y la petición viene de tu propio equipo, se usa `root` sin contraseña (el valor por defecto de XAMPP). Si tu MySQL tiene contraseña, copia `config/config.local.example.php` como `config/config.local.php` y escribe tus datos.

> Si algo falla, la API devuelve un `codigo` de error y, **solo en tu equipo**, un campo `detalle_local` con la causa técnica. El detalle completo también queda en el log de errores de Apache (`xampp/apache/logs/error.log`).

## 5. La API

### `GET api/algoritmos.php`
| Parámetro | Descripción |
|---|---|
| `q` | Texto para el nombre o el código (máx. 100). |
| `clasificacion` | Clasificación exacta (máx. 80). |
| `limite` / `desplazamiento` | 1–100 (por defecto 100) / 0 o más. |

```json
{ "ok": true, "total": 14, "cantidad": 14,
  "datos": [ { "id": 1, "codigo": "ALG-01", "nombre": "Búsqueda lineal", "clasificacion": "...", "descripcion": "..." } ],
  "clasificaciones": ["Búsqueda basada en dispersión (hashing)", "..."], "generado": "2026-10-20T19:00:00+00:00" }
```

### `GET api/algoritmo.php?id=3` o `?codigo=ALG-03`
Devuelve todos los campos (incluye complejidades y observaciones).

### Códigos HTTP
`200` correcto · `400` parámetro inválido · `404` no existe · `405` método no permitido (solo GET/HEAD/OPTIONS) · `503` base de datos no disponible / no instalada / sin configurar · `500` error interno. Los errores tienen la forma `{"ok":false,"error":{"codigo":"...","mensaje":"..."}}` y nunca incluyen contraseñas ni rutas.

## 6. Flujo de datos, de MySQL a la pantalla

1. Al abrir `paginas/algoritmos.html`, `js/algoritmos.js` llama a `fetch("../api/algoritmos.php?...")`.
2. El **service worker** intercepta la petición (estrategia *Network First*): pide el dato al servidor.
3. `api/algoritmos.php` valida los parámetros, `config/database.php` abre la conexión **PDO**, y se ejecutan **consultas preparadas** (los valores del usuario nunca se pegan en el SQL).
4. MySQL devuelve las filas; PHP las convierte a JSON UTF-8.
5. El service worker guarda una copia (con fecha) y responde a la página.
6. `algoritmos.js` dibuja la tabla con `textContent` (el texto se escapa solo, no se ejecuta HTML) y llena el menú de clasificaciones con lo que trajo la BD.
7. Cada búsqueda o filtro repite el proceso con `?q=` / `?clasificacion=`. «Ver detalles» llama a `api/algoritmo.php?id=N`.
8. **Sin Internet** (o si el servidor falla): el service worker entrega la última copia de hasta 7 días con la cabecera `X-Desde-Cache`, y la página muestra *«estás viendo datos guardados el… podrían no estar actualizados»*. Los filtros se aplican entonces sobre esa lista guardada. Con Internet **nunca** se sirven datos viejos.

No se guarda ninguna contraseña ni dato sensible en el caché: solo el catálogo público de algoritmos.

## 7. Despliegue en un servidor en la nube

> No tengo acceso a ningún servidor tuyo, así que **no desplegué nada**. Lo siguiente es la guía para hacerlo tú.

### A) Hosting compartido (cPanel o similar)
1. **Base y usuario:** en *Bases de datos MySQL* crea la base (quedará con prefijo, p. ej. `micuenta_algoritmos`) y un usuario con contraseña larga. Asígnalo a la base con permiso **solo SELECT** (la app solo lee).
2. **Importar:** en phpMyAdmin **selecciona esa base** → *Importar* → `bd_algoritmos_busqueda.sql`. Antes, abre el archivo y quita las dos líneas marcadas `<<< QUITAR EN HOSTING` (`CREATE DATABASE` y `USE`). *Importante:* el usuario de solo lectura no puede importar; haz la importación con el usuario principal de la cuenta (phpMyAdmin) y deja el de solo lectura para la app.
3. **Credenciales:** copia `config/config.local.example.php` → `config/config.local.php` y escribe host (`localhost`), nombre de base, usuario y contraseña. (Alternativa: variables de entorno `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `APP_ENV=production`.) Para forzar modo producción sin variables de entorno, crea en `public_html/.htaccess`: `SetEnv APP_ENV production`.
4. **Subir archivos:** por el Administrador de archivos o FTP/SFTP, sube **todo el proyecto** a `public_html/` (o a una subcarpeta). Respeta las carpetas: `api/`, `config/`, `js/`, `estilos/`, `paginas/`, `imagenes/`, `modelo/`, `lib/`, etc.
5. **Rutas:** las rutas son relativas, así que funciona en la raíz o en una subcarpeta sin cambiar nada. La API queda en `https://tudominio/…/api/algoritmos.php`.
6. **HTTPS:** activa *SSL/TLS* → *AutoSSL* / «Let's Encrypt» y marca «Forzar HTTPS». Los service workers **solo funcionan con HTTPS** (o localhost).
7. **Permisos:** carpetas `755` y archivos `644`. Nada debe tener permiso de escritura para «otros». `config.local.php` en `640` o `600` si el hosting lo permite.

### B) Servidor en la nube (VPS Ubuntu: DigitalOcean, AWS Lightsail, etc.)
```bash
sudo apt update && sudo apt install -y apache2 php libapache2-mod-php php-mysql mariadb-server certbot python3-certbot-apache
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE bd_algoritmos_busqueda CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;"
sudo mysql --default-character-set=utf8mb4 < sql/bd_algoritmos_busqueda.sql
sudo mysql -e "CREATE USER 'usr_algoritmos'@'localhost' IDENTIFIED BY 'UNA_CLAVE_LARGA'; GRANT SELECT ON bd_algoritmos_busqueda.algoritmos TO 'usr_algoritmos'@'localhost';"
sudo cp -r ia-cbtis260 /var/www/html/ && sudo chown -R www-data:www-data /var/www/html/ia-cbtis260 && sudo find /var/www/html/ia-cbtis260 -type d -exec chmod 755 {} \; -o -type f -exec chmod 644 {} \;
```
Credenciales por variables de entorno (en el `VirtualHost`, o `/etc/apache2/conf-available/algoritmos.conf` y `sudo a2enconf algoritmos`):
```apache
SetEnv APP_ENV production
SetEnv DB_HOST localhost
SetEnv DB_NAME bd_algoritmos_busqueda
SetEnv DB_USER usr_algoritmos
SetEnv DB_PASS UNA_CLAVE_LARGA
```
Habilita `.htaccess` para esa carpeta (`AllowOverride All`) y reinicia: `sudo a2enmod headers && sudo systemctl restart apache2`. Con un dominio apuntando al servidor: `sudo certbot --apache -d tudominio.com` (activa HTTPS y la renovación automática).

### C) Probar que la PWA consulta al servidor
1. `https://tudominio/…/api/algoritmos.php` → JSON con 14 registros.
2. Abre la PWA → **Algoritmos de búsqueda** → debe verse la tabla; prueba una búsqueda y un filtro.
3. DevTools (F12) → *Application* → *Service Workers* (activado) y *Cache Storage* (`ia-cbtis260-api-v6` con respuestas).
4. Marca *Offline* en DevTools y recarga: debe aparecer el aviso de datos guardados.

### D) Verificación de seguridad
- `https://tudominio/…/config/database.php` y `…/sql/bd_algoritmos_busqueda.sql` deben dar **403** (las protege `.htaccess`; en Nginx hay que bloquearlas con `location`).
- Ninguna respuesta de la API muestra rutas, contraseñas ni mensajes de MySQL.
- El usuario de la app solo tiene `SELECT`.
- `config.local.php` no está en tu repositorio de GitHub (ya está en `.gitignore`).
- Si el frontend estuviera en **otro dominio**: define `ALLOWED_ORIGINS=https://tu-frontend.com`. Sin esa variable la API no envía cabeceras CORS (solo mismo origen).

### E) Problemas comunes
| Síntoma | Causa y solución |
|---|---|
| `servicio_sin_configurar` | Falta `config.local.php` o las variables `DB_*`. |
| `servicio_no_disponible` | MySQL apagado, host/puerto/usuario/contraseña incorrectos. En Windows usa `127.0.0.1` en vez de `localhost`. Revisa el log de errores. |
| `base_no_instalada` | No se importó el SQL, o `DB_NAME` no coincide (en hosting lleva prefijo). |
| 404 en la API | La carpeta `api/` no se subió o la URL no incluye la subcarpeta correcta. |
| 403 al abrir la API | Permisos incorrectos (carpetas 755, archivos 644). |
| La tabla no aparece pero la API sí funciona | Caché viejo: DevTools → *Application* → *Clear storage*, o sube `VERSION` en `service-worker.js`. |
| Acentos raros (`BÃºsqueda`) | Se importó con otra codificación: importa con `utf8mb4`. |
| El service worker no se registra | Falta HTTPS (fuera de localhost). |

## 8. Cambios a archivos existentes
- **Menú:** nueva opción «🔎 Algoritmos de búsqueda» en `index.html`, todas las páginas de `paginas/` y `php/encabezado.php`; tarjeta de acceso rápido en `index.html`.
- **Rutas rotas (corregidas):** `src="…js"` ahora apunta a `js/` en `index.html`, `paginas/*.html` y `php/pie.php`; `js/pwa.js` registra `../service-worker.js`; `js/modelo.js` busca `../modelo/`; `service-worker.js` y `paginas/offline.html` usan las rutas nuevas.
- **`service-worker.js`:** versión `v6`, nuevo caché de la API (método 6), nuevos archivos en `ARCHIVOS`, mensaje `LIMPIAR_API`.
- **`js/cache-panel.js`:** reconoce el nuevo caché. **`DOCUMENTACION-CACHE.md`:** documenta el método 6.
- `manifest.json`, estilos existentes y la app `php/` no se modificaron (solo su menú y la ruta del script).

## 9. Pruebas realizadas (resultados reales)
Entorno: PHP 8.3.6 CLI (`php -S`), MariaDB 10.11, Chromium headless con Playwright. **No** se probó en XAMPP de Windows ni en un hosting real.

| Prueba | Resultado |
|---|---|
| Importar el SQL desde cero y reimportarlo | 14 registros; la reimportación no duplica |
| `pruebas/probar_api.py` (lista, búsqueda, filtros, paginación, 8 validaciones 400, inyección SQL, 405, detalle por id/código, 404) | **44 / 44** (también con un usuario MySQL de solo SELECT y `APP_ENV=production`) |
| Usuario de solo lectura intenta `DELETE` | Rechazado por MySQL (error 1142) |
| Errores controlados: contraseña incorrecta, base inexistente, tabla faltante, sin configurar, MySQL apagado | 503 con código y mensaje seguro; sin credenciales en la respuesta |
| CORS: origen permitido / no permitido / preflight `OPTIONS` | Cabecera solo para el origen permitido; `204` en el preflight |
| `pruebas/probar_navegador.py` (tabla, columnas, búsqueda, filtro, detalle, móvil 375 px, error 503 + Reintentar, offline con servidor apagado, sin datos guardados, escape de HTML) | **31 / 31** |
| Regresión: 18 páginas HTML sin errores ni 404; todos los archivos de `ARCHIVOS` existen; el service worker se instala y el panel de caché muestra la API | Correcto |

Para repetirlas: `python3 pruebas/probar_api.py http://localhost/ia-cbtis260` y `python3 pruebas/probar_navegador.py` (necesita `pip install playwright && playwright install chromium`, PHP en el PATH y MySQL encendido con la BD importada).

**Límites honestos:** los `.htaccess` (bloqueo de `config/` y `sql/`) **no se pudieron probar**, porque el servidor integrado de PHP no los usa; compruébalo con la lista de la sección 7-D. el modelo de Teachable Machine y el lector en voz alta no se probaron funcionalmente (solo que sus archivos carguen sin 404). Las fuentes de Google no se pudieron cargar en el entorno de pruebas (sin Internet), por lo que las capturas usan la tipografía de respaldo.
