const CACHE_NAME = "ia-cbtis260-v1";

const ARCHIVOS = [
    "./",
    "./index.html",
    "./que-es.html",
    "./tipos.html",
    "./antecedentes.html",
    "./aplicaciones.html",
    "./ventajas.html",
    "./desventajas.html",
    "./impacto.html",
    "./consecuencias.html",
    "./etica.html",
    "./programacion.html",
    "./video.html",
    "./contacto.html",
    "./estilos/estilos.css",
    "./imagenes/logo-cbtis260.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ARCHIVOS);
        })
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(claves => {
            return Promise.all(
                claves
                    .filter(clave => clave !== CACHE_NAME)
                    .map(clave => caches.delete(clave))
            );
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(respuesta => {
            return respuesta || fetch(event.request);
        })
    );
});