// Aquí creo una constante llamada CACHE_NAME para darle un nombre y una versión
// al caché que voy a utilizar en mi aplicación.
// Cada vez que actualice mi sitio, cambio el número de versión (v3, v4...)
// para que la aplicación instalada descargue los archivos nuevos.
const CACHE_NAME = "ia-cbtis260-v3";

// Aquí creo una lista llamada ARCHIVOS donde guardo las páginas,
// estilos, scripts e imágenes que quiero almacenar en el caché.
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

// Aquí creo un evento "install", que se ejecuta cuando mi Service Worker
// se instala por primera vez.
self.addEventListener("install", event => {

    // Hago que la nueva versión se active sin esperar a que se cierre la app.
    self.skipWaiting();

    // Aquí espero a que termine el proceso de instalación antes de continuar.
    event.waitUntil(

        // Abro el caché que tiene el nombre que definí anteriormente.
        caches.open(CACHE_NAME).then(cache => {

            // Aquí agrego todos los archivos de mi lista al caché.
            // Esto permite que puedan estar disponibles incluso sin conexión.
            return cache.addAll(ARCHIVOS);
        })
    );
});

// Aquí creo un evento "activate", que se ejecuta cuando mi Service Worker
// se activa después de instalarse.
self.addEventListener("activate", event => {

    // Espero a que termine la limpieza de los cachés anteriores.
    event.waitUntil(

        // Aquí obtengo todos los nombres de los cachés que existen.
        caches.keys().then(claves => {

            // Creo una promesa para eliminar los cachés que ya no utilizo.
            return Promise.all(

                // Busco los cachés cuyo nombre sea diferente al de mi versión actual.
                claves
                    .filter(clave => clave !== CACHE_NAME)

                    // Aquí elimino los cachés que pertenecen a versiones anteriores.
                    .map(clave => caches.delete(clave))
            );
        }).then(() => self.clients.claim()) // Tomo el control de las páginas abiertas.
    );
});

// Aquí creo un evento "fetch", que se ejecuta cada vez que mi página
// solicita un archivo, como una página HTML, CSS o una imagen.
self.addEventListener("fetch", event => {

    // Solo atiendo solicitudes GET de mi propio sitio.
    // La aplicación PHP (carpeta php/) necesita el servidor, así que no la guardo en caché.
    const url = new URL(event.request.url);
    if (event.request.method !== "GET" || url.origin !== location.origin || url.pathname.includes("/php/")) {
        return;
    }

    // Aquí controlo la respuesta que se le dará a cada solicitud.
    event.respondWith(

        // Primero intento pedir el archivo a Internet para tener siempre la versión más nueva.
        fetch(event.request)
            .then(respuesta => {
                // Guardo una copia en el caché para cuando no haya conexión.
                if (respuesta.ok) {
                    const copia = respuesta.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
                }
                return respuesta;
            })

            // Si no hay Internet, utilizo la versión que ya está guardada en el caché.
            .catch(() => caches.match(event.request).then(guardado => guardado || caches.match("./index.html")))
    );
});
