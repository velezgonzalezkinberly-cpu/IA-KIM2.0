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

   3) FALLBACK OFFLINE
      - Si no hay Internet y el archivo no está en ningún caché,
        se muestra offline.html (o index.html si es una navegación).
   ===================================================================== */

// Versión del service worker. Cada vez que cambie mis archivos subo el número
// (v4, v5...) para que la app instalada descargue lo nuevo y borre lo viejo.
const VERSION = "v4";

// Nombre del caché ESTÁTICO (memoria caché): los archivos de mi app.
const CACHE_ESTATICO = "ia-cbtis260-estatico-" + VERSION;

// Nombre del caché DINÁMICO (API Cache): lo que se guarda al navegar.
const CACHE_DINAMICO = "ia-cbtis260-dinamico-" + VERSION;

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
// EVENTO INSTALL → aquí se crea la MEMORIA CACHÉ (caché estático)
// ---------------------------------------------------------------------
self.addEventListener("install", event => {

    // Hago que la nueva versión se active sin esperar a que se cierre la app.
    self.skipWaiting();

    event.waitUntil(
        // caches.open() abre (o crea) el caché con el nombre indicado.
        caches.open(CACHE_ESTATICO).then(cache => {
            // cache.addAll() descarga y guarda todos los archivos de mi lista.
            return cache.addAll(ARCHIVOS);
        })
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
                    // Conservo solo los dos cachés de la versión actual.
                    .filter(clave => clave !== CACHE_ESTATICO && clave !== CACHE_DINAMICO)
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
//   { accion: "ACTIVAR" }           → activa de inmediato una versión nueva
// ---------------------------------------------------------------------
self.addEventListener("message", event => {
    const orden = event.data && event.data.accion;

    if (orden === "LIMPIAR_DINAMICO") {
        event.waitUntil(caches.delete(CACHE_DINAMICO));
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
