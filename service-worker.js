// Aquí creo una constante llamada CACHE_NAME para darle un nombre y una versión
// al caché que voy a utilizar en mi aplicación.
const CACHE_NAME = "ia-cbtis260-v2";

// Aquí creo una lista llamada ARCHIVOS donde guardo las páginas,
// estilos e imágenes que quiero almacenar en el caché.
const ARCHIVOS = [
    "./", // Indico la carpeta principal de mi sitio.
    "./index.html", // Guardo mi página principal.
    "./que-es.html", // Guardo la página donde explico qué es la Inteligencia Artificial.
    "./tipos.html", // Guardo la página donde explico los tipos de IA.
    "./antecedentes.html", // Guardo la página sobre los antecedentes de la IA.
    "./aplicaciones.html", // Guardo la página sobre las aplicaciones de la IA.
    "./ventajas.html", // Guardo la página donde explico sus ventajas.
    "./desventajas.html", // Guardo la página donde explico sus desventajas.
    "./impacto.html", // Guardo la página sobre el impacto de la IA.
    "./consecuencias.html", // Guardo la página sobre sus consecuencias.
    "./etica.html", // Guardo la página relacionada con la ética en la IA.
    "./programacion.html", // Guardo la página relacionada con programación.
    "./video.html", // Guardo la página donde tengo mi contenido de video.
    "./contacto.html", // Guardo la página de contacto.
    "./estilos/estilos.css", // Guardo mi archivo de estilos CSS.
    "./imagenes/logo-cbtis260.png" // Guardo el logo de mi sitio.
];

// Aquí creo un evento "install", que se ejecuta cuando mi Service Worker
// se instala por primera vez.
self.addEventListener("install", event => {

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
        })
    );
});

// Aquí creo un evento "fetch", que se ejecuta cada vez que mi página
// solicita un archivo, como una página HTML, CSS o una imagen.
self.addEventListener("fetch", event => {

    // Aquí controlo la respuesta que se le dará a cada solicitud.
    event.respondWith(

        // Primero busco si el archivo solicitado ya está guardado en el caché.
        caches.match(event.request).then(respuesta => {

            // Si encuentro el archivo en el caché, utilizo esa versión.
// Si no lo encuentro, utilizo fetch para solicitarlo desde Internet.
            return respuesta || fetch(event.request);
        })
    );
});
