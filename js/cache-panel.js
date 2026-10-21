/* =========================================================
   cache-panel.js · Panel en vivo de MEMORIA CACHÉ y API CACHE
   Solo se usa en paginas/cache.html.
   Aquí uso la Cache API (window.caches) desde la propia página:
     caches.keys()   → lista los cachés que existen
     caches.open()   → abre (o crea) un caché
     cache.keys()    → lista los archivos guardados
     cache.put()     → guarda una respuesta
     cache.match()   → busca una respuesta guardada
     caches.delete() → borra un caché completo
   ========================================================= */
(function () {
    "use strict";

    const raiz = document.getElementById("cache-panel");
    if (!raiz) return;

    const $ = id => document.getElementById(id);
    const salida = $("cache-salida");
    const lista = $("cache-lista");
    const estado = $("cache-estado");

    // Prefijos con los que el service worker nombra sus cachés.
    const PREFIJO_ESTATICO = "ia-cbtis260-estatico-";
    const PREFIJO_DINAMICO = "ia-cbtis260-dinamico-";
    const PREFIJO_MODELO = "ia-cbtis260-modelo-";
    const PREFIJO_PAGINAS = "ia-cbtis260-paginas-";
    const PREFIJO_IMAGENES = "ia-cbtis260-imagenes-";
    const PREFIJO_API = "ia-cbtis260-api-";
    const CLAVE_DEMO = "./api-cache-demo.json"; // Clave ficticia para la demostración.

    function log(texto) { salida.textContent = texto; }

    // Sin soporte (por ejemplo abriendo el archivo con file://) no se puede usar la Cache API.
    if (!("caches" in window)) {
        log("Este navegador no tiene Cache API, o la página está abierta con file://.\nAbre el sitio con http://localhost (XAMPP) o con HTTPS.");
        return;
    }

    // Devuelve el nombre del caché dinámico actual (o uno nuevo si aún no existe).
    async function nombreDinamico() {
        const claves = await caches.keys();
        return claves.find(c => c.startsWith(PREFIJO_DINAMICO)) || PREFIJO_DINAMICO + "v6";
    }

    // Dibuja la lista de cachés con sus archivos.
    async function actualizar() {
        lista.textContent = "";
        const nombres = await caches.keys();

        if (!nombres.length) {
            const p = document.createElement("p");
            p.textContent = "Todavía no hay cachés. Recarga la página una vez para que el service worker los cree.";
            lista.appendChild(p);
        }

        for (const nombre of nombres) {
            const cache = await caches.open(nombre);
            const archivos = await cache.keys();
            // Etiqueta que explica qué método usa cada caché.
            let tipo = "otro";
            if (nombre.startsWith(PREFIJO_ESTATICO)) tipo = "Memoria caché (estático)";
            else if (nombre.startsWith(PREFIJO_DINAMICO)) tipo = "API Cache (dinámico)";
            else if (nombre.startsWith(PREFIJO_MODELO)) tipo = "Caché del modelo · Cache First";
            else if (nombre.startsWith(PREFIJO_PAGINAS)) tipo = "Caché de páginas · Network First";
            else if (nombre.startsWith(PREFIJO_IMAGENES)) tipo = "Caché de imágenes · Cache First con caducidad";
            else if (nombre.startsWith(PREFIJO_API)) tipo = "Caché de la API · Network First con caducidad";

            const detalle = document.createElement("details");
            const resumen = document.createElement("summary");
            resumen.textContent = nombre + " · " + archivos.length + " archivos · " + tipo;
            detalle.appendChild(resumen);

            const ul = document.createElement("ul");
            archivos.forEach(a => {
                const li = document.createElement("li");
                li.textContent = new URL(a.url).pathname;
                ul.appendChild(li);
            });
            detalle.appendChild(ul);
            lista.appendChild(detalle);
        }

        // Estado general: conexión, service worker y almacenamiento usado.
        estado.textContent = "";
        const datos = [];
        datos.push(navigator.onLine ? "🟢 Con conexión" : "🔴 Sin conexión");
        datos.push(navigator.serviceWorker && navigator.serviceWorker.controller
            ? "⚙️ Service worker activo" : "⚙️ Service worker aún no controla esta página (recarga)");
        if (navigator.storage && navigator.storage.estimate) {
            const e = await navigator.storage.estimate();
            datos.push("💾 Usado: " + (e.usage / 1048576).toFixed(2) + " MB de " + (e.quota / 1048576).toFixed(0) + " MB");
        }
        datos.forEach(t => { const s = document.createElement("span"); s.textContent = t; estado.appendChild(s); });
    }

    // DEMO API CACHE: guardo un JSON con cache.put() y lo leo con cache.match().
    async function demo() {
        const cache = await caches.open(await nombreDinamico());
        const contenido = { mensaje: "Hola desde la API Cache", fecha: new Date().toLocaleString("es-MX") };

        await cache.put(CLAVE_DEMO, new Response(JSON.stringify(contenido), {
            headers: { "Content-Type": "application/json" }
        }));

        const encontrado = await cache.match(CLAVE_DEMO);
        const leido = await encontrado.json();

        log("1) cache.put()   → guardé una respuesta con la clave " + CLAVE_DEMO +
            "\n2) cache.match() → la encontré en el caché dinámico" +
            "\n3) Contenido leído:\n" + JSON.stringify(leido, null, 2));
        actualizar();
    }

    // Guardo manualmente una página del sitio en el caché dinámico (cache.add).
    async function guardarPagina() {
        const destino = $("cache-pagina").value;
        try {
            const cache = await caches.open(await nombreDinamico());
            await cache.add(destino); // cache.add = fetch + cache.put
            log("cache.add('" + destino + "') → página guardada en el caché dinámico.");
        } catch (e) {
            log("No se pudo guardar: " + e.message);
        }
        actualizar();
    }

    async function vaciarDinamico() {
        await caches.delete(await nombreDinamico());
        log("caches.delete() → el caché dinámico (API Cache) fue eliminado.\nSe volverá a llenar mientras navegas.");
        actualizar();
    }

    async function vaciarTodo() {
        const nombres = await caches.keys();
        await Promise.all(nombres.map(n => caches.delete(n)));
        log("Se eliminaron todos los cachés (" + nombres.length + ").\nRecarga con Internet para que se vuelvan a crear.");
        actualizar();
    }

    $("cache-actualizar").addEventListener("click", actualizar);
    $("cache-demo").addEventListener("click", demo);
    $("cache-guardar").addEventListener("click", guardarPagina);
    $("cache-vaciar-dinamico").addEventListener("click", vaciarDinamico);
    $("cache-vaciar-todo").addEventListener("click", vaciarTodo);
    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);

    actualizar();
})();
