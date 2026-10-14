/* =====================================================================
   service-worker.js · MEMORIA CACHÉ y API CACHE de la PWA
   ---------------------------------------------------------------------
   DOCUMENTACIÓN RÁPIDA (la versión completa está en DOCUMENTACION-CACHE.md
   y en la página paginas/cache.html de este mismo sitio)

   1) MEMORIA CACHÉ (caché estático / "app shell")
      - Es el caché "ia-cbtis260-estatico-vX".
      - Se llena en el evento INSTALL con cache.addAll(ARCHIVOS).
      - Guarda lo que la app necesita para abrir sin Internet:
        páginas HTML, CSS, JS e imágenes propias.
      - Estrategia: STALE-WHILE-REVALIDATE (respondo rápido con lo guardado
        y en segundo plano lo actualizo con la versión nueva de la red).

   2) API CACHE (caché dinámico / "runtime")
      - Es el caché "ia-cbtis260-dinamico-vX".
      - Se llena sola, mientras la persona navega, con el evento FETCH.
      - Guarda lo que NO está en la lista de arriba: fuentes de Google,
        páginas nuevas, imágenes subidas desde PHP, etc.
      - Usa la Cache API del navegador: caches.open(), cache.put(),
        cache.match(), cache.keys(), cache.delete() y caches.keys().
      - Tiene un límite (LIMITE_DINAMICO) para no llenar el almacenamiento.

   3) CACHÉ DEL MODELO · método CACHE FIRST
      - Es el caché "ia-cbtis260-modelo-vX".
      - Guarda el modelo de Teachable Machine (carpeta modelo/) y las
        bibliotecas TensorFlow.js (carpeta lib/). Pesan varios MB y casi
        nunca cambian, así que primero busco en el caché y solo voy a la
        red si no está guardado. Se llena en install y también al usarlo.

   4) CACHÉ DE PÁGINAS · método NETWORK FIRST (con tiempo límite)
      - Es el caché "ia-cbtis260-paginas-vX".
      - Cada vez que se abre una página HTML intento traer la versión
        más nueva de la red. Si la red tarda más de TIEMPO_RED o no hay
        Internet, uso la última copia guardada.

   5) CACHÉ DE IMÁGENES · método CACHE FIRST CON CADUCIDAD
      - Es el caché "ia-cbtis260-imagenes-vX".
      - Guarda las imágenes que NO están en la lista inicial (por ejemplo
        las que se suben desde PHP). Cada copia lleva su fecha y caduca a
        los DIAS_IMAGENES días; además hay un máximo de LIMITE_IMAGENES.

   6) FALLBACK OFFLINE
      - Si no hay Internet y el archivo no está en ningún caché,
        se muestra offline.html (o index.html si es una navegación).
   ===================================================================== */

// Versión del service worker. Cada vez que cambie mis archivos subo el número
// (v4, v5...) para que la app instalada descargue lo nuevo y borre lo viejo.
const VERSION = "v5";

// Nombre del caché ESTÁTICO (memoria caché): los archivos de mi app.
const CACHE_ESTATICO = "ia-cbtis260-estatico-" + VERSION;

// Nombre del caché DINÁMICO (API Cache): lo que se guarda al navegar.
const CACHE_DINAMICO = "ia-cbtis260-dinamico-" + VERSION;

// Nombre del caché del MODELO (método 3: Cache First).
const CACHE_MODELO = "ia-cbtis260-modelo-" + VERSION;

// Nombre del caché de PÁGINAS (método 4: Network First).
const CACHE_PAGINAS = "ia-cbtis260-paginas-" + VERSION;

// Nombre del caché de IMÁGENES (método 5: Cache First con caducidad).
const CACHE_IMAGENES = "ia-cbtis260-imagenes-" + VERSION;

// Lista de todos los cachés de esta versión (los demás se borran en activate).
const CACHES_ACTUALES = [CACHE_ESTATICO, CACHE_DINAMICO, CACHE_MODELO, CACHE_PAGINAS, CACHE_IMAGENES];

// Milisegundos que espero a la red antes de usar la copia guardada (Network First).
const TIEMPO_RED = 3500;

// Días que puede vivir una imagen en el caché de imágenes y máximo de imágenes.
const DIAS_IMAGENES = 7;
const LIMITE_IMAGENES = 30;

// Archivos del modelo y de las bibliotecas que guardo en CACHE_MODELO.
const ARCHIVOS_MODELO = [
    "./modelo/model.json", // Estructura de la red neuronal.
    "./modelo/metadata.json", // Nombres de las clases (kinberly / no_kinberly).
    "./modelo/weights.bin", // Pesos entrenados del modelo.
    "./lib/tf.min.js", // TensorFlow.js.
    "./lib/teachablemachine-image.min.js" // Biblioteca de Teachable Machine.
];

// Máximo de archivos que permito en el caché dinámico.
// Cuando se pasa, borro los más antiguos (el primero que entró es el primero que sale).
const LIMITE_DINAMICO = 40;

// Página de respaldo para cuando no hay Internet y no encuentro nada guardado.
const PAGINA_OFFLINE = "./offline.html";

const ARCHIVOS = [
    "./", // Indico la carpeta principal de mi sitio.
    "./index.html", // Guardo mi página principal.
    "./paginas/que-es.html", // Guardo la página donde explico qué es la Inteligencia Artificial.
    "./paginas/tipos.html", // Guardo la página donde explico los tipos de IA.
    "./paginas/antecedentes.html", // Guardo la página sobre los antecedentes de la IA.
    "./paginas/aplicaciones.html", // Guardo la página sobre las aplicaciones de la IA.
    "./paginas/ventajas.html", // Guardo la página donde explico sus ventajas.
    "./paginas/desventajas.html", // Guardo la página donde explico sus desventajas.
    "./paginas/impacto.html", // Guardo la página sobre el impacto de la IA.
    "./paginas/consecuencias.html", // Guardo la página sobre sus consecuencias.
    "./paginas/etica.html", // Guardo la página relacionada con la ética en la IA.
    "./paginas/programacion.html", // Guardo la página relacionada con programación.
    "./paginas/glosario.html", // Guardo la página del glosario de IA.
    "./paginas/video.html", // Guardo la página donde tengo mi contenido de video.
    "./paginas/contacto.html", // Guardo la página de información y contacto.
    "./estilos/estilos.css", // Guardo mi hoja de estilos estilos.css.
    "./estilos/escuchar.css", // Guardo mi hoja de estilos escuchar.css.
    "./estilos/glosario.css", // Guardo mi hoja de estilos glosario.css.
    "./escuchar.js", // Guardo el JavaScript de el lector en voz alta.
    "./pwa.js", // Guardo el JavaScript de el registro de la PWA.
    "./cache-panel.js", // Guardo el JavaScript del panel que muestra el caché.
    "./offline.html", // Guardo la página que se muestra si no hay conexión y la página pedida no está guardada.
    "./paginas/cache.html", // Guardo la página donde documento el caché.
    "./paginas/modelo.html", // Guardo la página donde se usa el modelo de IA.
    "./modelo.js", // Guardo el JavaScript de la página del modelo.
    "./estilos/modelo.css", // Guardo los estilos de la página del modelo.
    "./estilos/cache.css", // Guardo la hoja de estilos de la página del caché.
    "./glosario.js", // Guardo el JavaScript de la lógica del glosario.
    "./glosario-datos.js", // Guardo el JavaScript de los datos del glosario.
    "./imagenes/logo-cbtis260.png", // Guardo el logo de mi sitio.
    "./imagenes/glosario/concepto-01.jpg", // Imagen 1 del glosario.
    "./imagenes/glosario/concepto-02.jpg", // Imagen 2 del glosario.
    "./imagenes/glosario/concepto-03.jpg", // Imagen 3 del glosario.
    "./imagenes/glosario/concepto-04.jpg", // Imagen 4 del glosario.
    "./imagenes/glosario/concepto-05.jpg", // Imagen 5 del glosario.
    "./imagenes/glosario/concepto-06.jpg", // Imagen 6 del glosario.
    "./imagenes/glosario/concepto-07.jpg", // Imagen 7 del glosario.
    "./imagenes/glosario/concepto-08.jpg", // Imagen 8 del glosario.
    "./imagenes/glosario/concepto-09.jpg", // Imagen 9 del glosario.
    "./imagenes/glosario/concepto-10.jpg", // Imagen 10 del glosario.
    "./imagenes/glosario/concepto-11.jpg", // Imagen 11 del glosario.
    "./imagenes/glosario/concepto-12.jpg", // Imagen 12 del glosario.
    "./imagenes/glosario/concepto-13.jpg", // Imagen 13 del glosario.
    "./imagenes/glosario/concepto-14.jpg", // Imagen 14 del glosario.
    "./imagenes/glosario/concepto-15.jpg" // Imagen 15 del glosario.
];

// ---------------------------------------------------------------------
// FUNCIONES AUXILIARES DE LA API CACHE
// ---------------------------------------------------------------------

// Esta función recorta un caché para que no tenga más de "maximo" archivos.
// Uso cache.keys() para listar las entradas y cache.delete() para borrar la más vieja.
async function limitarCache(nombre, maximo) {
    const cache = await caches.open(nombre);
    const claves = await cache.keys();
    if (claves.length > maximo) {
        await cache.delete(claves[0]);          // Borro la entrada más antigua.
        return limitarCache(nombre, maximo);    // Repito hasta quedar dentro del límite.
    }
}

// Esta función guarda una respuesta en el caché dinámico (cache.put).
// Acepto respuestas normales (ok) y "opaque" (las de otros sitios como Google Fonts,
// que el navegador no deja leer pero sí guardar y reutilizar).
async function guardarDinamico(peticion, respuesta) {
    if (respuesta && (respuesta.ok || respuesta.type === "opaque")) {
        const cache = await caches.open(CACHE_DINAMICO);
        await cache.put(peticion, respuesta.clone());   // Guardo una COPIA, la original sigue su camino.
        limitarCache(CACHE_DINAMICO, LIMITE_DINAMICO);
    }
    return respuesta;
}

// ---------------------------------------------------------------------
// MÉTODO 3 · CACHE FIRST  → caché del MODELO
// 1. Busco en el caché. 2. Si está, lo entrego (sin gastar Internet).
// 3. Si no está, lo pido a la red y guardo una copia para la próxima vez.
// ---------------------------------------------------------------------
async function cacheFirstModelo(peticion) {
    const cache = await caches.open(CACHE_MODELO);
    const guardado = await cache.match(peticion, { ignoreSearch: true });
    if (guardado) return guardado;

    const respuesta = await fetch(peticion);
    if (respuesta.ok) await cache.put(peticion, respuesta.clone());
    return respuesta;
}

// ---------------------------------------------------------------------
// MÉTODO 4 · NETWORK FIRST  → caché de PÁGINAS
// 1. Pido la página a la red (así siempre veo lo más nuevo).
// 2. Si la red responde a tiempo, guardo una copia y la entrego.
// 3. Si falla o tarda más de TIEMPO_RED, entrego la última copia guardada.
// ---------------------------------------------------------------------
async function networkFirstPaginas(peticion) {
    const cache = await caches.open(CACHE_PAGINAS);

    const desdeRed = fetch(peticion).then(async respuesta => {
        if (respuesta.ok) await cache.put(peticion, respuesta.clone());
        return respuesta;
    });

    // Una promesa que se rechaza si la red tarda demasiado.
    const limite = new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("tiempo")), TIEMPO_RED));

    try {
        return await Promise.race([desdeRed, limite]);
    } catch (error) {
        desdeRed.catch(() => {}); // Que termine en segundo plano sin hacer ruido.
        const copia = await cache.match(peticion)
            || await caches.match(peticion, { ignoreSearch: true })
            || await caches.match("./index.html")
            || await caches.match(PAGINA_OFFLINE);
        if (copia) return copia;
        return desdeRed; // Último intento: esperar a la red.
    }
}

// ---------------------------------------------------------------------
// MÉTODO 5 · CACHE FIRST CON CADUCIDAD  → caché de IMÁGENES
// Cada imagen se guarda con una cabecera "sw-fecha" (cuándo se guardó).
// Si la copia tiene más de DIAS_IMAGENES días la considero vencida: la borro
// y pido una nueva. Si no hay Internet, prefiero una vencida a no mostrar nada.
// ---------------------------------------------------------------------
async function cacheFirstImagenes(peticion) {
    const cache = await caches.open(CACHE_IMAGENES);
    const guardado = await cache.match(peticion);

    if (guardado) {
        const fecha = Number(guardado.headers.get("sw-fecha")) || 0;
        const edad = Date.now() - fecha;
        if (edad < DIAS_IMAGENES * 24 * 60 * 60 * 1000) return guardado; // Todavía vigente.
    }

    try {
        const respuesta = await fetch(peticion);
        if (respuesta.ok) {
            // Copio la respuesta y le agrego la cabecera con la fecha de hoy.
            const cuerpo = await respuesta.clone().blob();
            const cabeceras = new Headers(respuesta.headers);
            cabeceras.set("sw-fecha", String(Date.now()));
            await cache.put(peticion, new Response(cuerpo, { status: 200, headers: cabeceras }));
            limitarCache(CACHE_IMAGENES, LIMITE_IMAGENES);
        }
        return respuesta;
    } catch (error) {
        if (guardado) return guardado;          // Sin red: uso la vencida.
        return caches.match(PAGINA_OFFLINE);
    }
}

// ---------------------------------------------------------------------
// EVENTO INSTALL → aquí se crea la MEMORIA CACHÉ (caché estático)
// ---------------------------------------------------------------------
self.addEventListener("install", event => {

    // Hago que la nueva versión se active sin esperar a que se cierre la app.
    self.skipWaiting();

    event.waitUntil(
        Promise.all([
            // caches.open() abre (o crea) el caché con el nombre indicado.
            caches.open(CACHE_ESTATICO).then(cache => {
                // cache.addAll() descarga y guarda todos los archivos de mi lista.
                return cache.addAll(ARCHIVOS);
            }),
            // También dejo guardado el modelo (Cache First). Si falla no cancelo la
            // instalación: el modelo se guardará la primera vez que se use.
            caches.open(CACHE_MODELO).then(cache => {
                return cache.addAll(ARCHIVOS_MODELO).catch(() => {});
            })
        ])
    );
});

// ---------------------------------------------------------------------
// EVENTO ACTIVATE → limpio los cachés de versiones anteriores
// ---------------------------------------------------------------------
self.addEventListener("activate", event => {
    event.waitUntil(
        // caches.keys() devuelve los nombres de todos los cachés que existen.
        caches.keys().then(claves => {
            return Promise.all(
                claves
                    // Conservo solo los cinco cachés de la versión actual.
                    .filter(clave => !CACHES_ACTUALES.includes(clave))
                    // caches.delete() elimina por completo un caché viejo.
                    .map(clave => caches.delete(clave))
            );
        }).then(() => self.clients.claim()) // Tomo el control de las páginas abiertas.
    );
});

// ---------------------------------------------------------------------
// EVENTO FETCH → decide de dónde sale cada archivo
// ---------------------------------------------------------------------
self.addEventListener("fetch", event => {

    const peticion = event.request;
    const url = new URL(peticion.url);

    // Solo atiendo solicitudes GET (la Cache API no puede guardar POST).
    if (peticion.method !== "GET") return;

    // La aplicación PHP (carpeta php/) necesita el servidor y la base de datos,
    // por eso NO la guardo en ningún caché.
    if (url.origin === location.origin && url.pathname.includes("/php/")) return;

    // Solo http/https (ignoro chrome-extension:// y similares).
    if (!url.protocol.startsWith("http")) return;

    const esMismoSitio = url.origin === location.origin;

    // ----- MÉTODO 3 · Cache First: el modelo y las bibliotecas -----
    if (esMismoSitio && (url.pathname.includes("/modelo/") || url.pathname.includes("/lib/"))) {
        event.respondWith(
            cacheFirstModelo(peticion).catch(() => caches.match(PAGINA_OFFLINE))
        );
        return;
    }

    // ----- MÉTODO 4 · Network First: las páginas HTML que se abren -----
    if (esMismoSitio && peticion.mode === "navigate") {
        event.respondWith(networkFirstPaginas(peticion));
        return;
    }

    // ----- MÉTODO 5 · Cache First con caducidad: imágenes que NO están en mi lista -----
    if (esMismoSitio && peticion.destination === "image") {
        event.respondWith(
            caches.open(CACHE_ESTATICO)
                .then(estatico => estatico.match(peticion))
                .then(yaEnLista => yaEnLista || cacheFirstImagenes(peticion))
        );
        return;
    }

    // ----- Archivos de MI sitio: STALE-WHILE-REVALIDATE -----
    // 1. Busco en el caché (caches.match busca en TODOS los cachés).
    // 2. Si lo encuentro, respondo de inmediato (rápido y sin Internet).
    // 3. Mientras tanto pido la versión nueva a la red y actualizo el caché.
    if (esMismoSitio) {
        event.respondWith(
            caches.match(peticion).then(guardado => {

                const desdeRed = fetch(peticion).then(respuesta => {
                    if (respuesta.ok) {
                        const copia = respuesta.clone();
                        // Reviso si el archivo ya vive en el caché estático (es de mi lista).
                        caches.open(CACHE_ESTATICO)
                            .then(estatico => estatico.match(peticion).then(existe => {
                                if (existe) {
                                    // Es de mi lista: actualizo la MEMORIA CACHÉ.
                                    return estatico.put(peticion, copia);
                                }
                                // No es de mi lista: lo guardo en la API CACHE dinámica.
                                return guardarDinamico(peticion, copia);
                            }));
                    }
                    return respuesta;
                });

                // Si ya estaba guardado, lo entrego YA y dejo que la red actualice en segundo plano.
                if (guardado) {
                    desdeRed.catch(() => {}); // Si falla la red no pasa nada, ya respondí.
                    return guardado;
                }

                // Si no estaba guardado, voy a la red; si no hay Internet uso el respaldo.
                return desdeRed.catch(() => {
                    // Si era una página, muestro el inicio u offline.html.
                    if (peticion.mode === "navigate") {
                        return caches.match("./index.html").then(r => r || caches.match(PAGINA_OFFLINE));
                    }
                    return caches.match(PAGINA_OFFLINE);
                });
            })
        );
        return;
    }

    // ----- Archivos de OTROS sitios (Google Fonts, etc.): API CACHE dinámica -----
    // Primero busco en el caché dinámico; si no está, lo pido y lo guardo.
    event.respondWith(
        caches.match(peticion).then(guardado => {
            return guardado || fetch(peticion)
                .then(respuesta => guardarDinamico(peticion, respuesta))
                .catch(() => caches.match(PAGINA_OFFLINE));
        })
    );
});

// ---------------------------------------------------------------------
// EVENTO MESSAGE → la página le puede mandar órdenes al service worker
//   { accion: "LIMPIAR_DINAMICO" }  → vacía solo el caché dinámico
//   { accion: "LIMPIAR_TODO" }      → borra todos los cachés de la app
//   { accion: "LIMPIAR_MODELO" }    → vacía el caché del modelo
//   { accion: "LIMPIAR_PAGINAS" }   → vacía el caché de páginas
//   { accion: "LIMPIAR_IMAGENES" }  → vacía el caché de imágenes
//   { accion: "ACTIVAR" }           → activa de inmediato una versión nueva
// ---------------------------------------------------------------------
self.addEventListener("message", event => {
    const orden = event.data && event.data.accion;

    if (orden === "LIMPIAR_DINAMICO") {
        event.waitUntil(caches.delete(CACHE_DINAMICO));
    }
    if (orden === "LIMPIAR_MODELO") {
        event.waitUntil(caches.delete(CACHE_MODELO));
    }
    if (orden === "LIMPIAR_PAGINAS") {
        event.waitUntil(caches.delete(CACHE_PAGINAS));
    }
    if (orden === "LIMPIAR_IMAGENES") {
        event.waitUntil(caches.delete(CACHE_IMAGENES));
    }
    if (orden === "LIMPIAR_TODO") {
        event.waitUntil(
            caches.keys().then(claves => Promise.all(claves.map(c => caches.delete(c))))
        );
    }
    if (orden === "ACTIVAR") {
        self.skipWaiting();
    }
});
