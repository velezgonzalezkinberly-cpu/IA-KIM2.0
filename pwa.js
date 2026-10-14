/* =========================================================
   pwa.js · Registro del Service Worker y detalles de la PWA
   Este archivo está en la raíz, junto a index.html y manifest.json.
   El service worker que se registra aquí crea cinco cachés:
     · Memoria caché (estático):  ia-cbtis260-estatico-vX   (stale-while-revalidate)
     · API Cache (dinámico):      ia-cbtis260-dinamico-vX   (cache first / put)
     · Caché del modelo:          ia-cbtis260-modelo-vX     (cache first)
     · Caché de páginas:          ia-cbtis260-paginas-vX    (network first)
     · Caché de imágenes:         ia-cbtis260-imagenes-vX   (cache first con caducidad)
   La explicación completa está en DOCUMENTACION-CACHE.md.
   ========================================================= */
(function () {
    "use strict";

    // Como pwa.js vive en la raíz, busco el service worker junto a él
    // sin importar si la página está en la raíz o dentro de /paginas/.
    const raiz = document.currentScript ? document.currentScript.src : location.href;

    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker
                .register(new URL("service-worker.js", raiz).href)
                .then(registro => {
                    console.log("PWA activada");
                    // Si hay una versión nueva esperando, le pido que se active de inmediato.
                    if (registro.waiting) registro.waiting.postMessage({ accion: "ACTIVAR" });
                })
                .catch(error => console.log("Error:", error));
        });
    }

    // ----- "Dato curioso" de la página de inicio -----
    const datos = [
        "El término «Inteligencia Artificial» se usó por primera vez en 1956, en la Conferencia de Dartmouth.",
        "En 1997, la computadora Deep Blue venció al campeón mundial de ajedrez Garri Kaspárov.",
        "ELIZA, creada en 1966, fue uno de los primeros chatbots de la historia.",
        "En 2016, el programa AlphaGo venció a Lee Sedol, uno de los mejores jugadores de Go del mundo.",
        "Los asistentes de voz, los traductores y el desbloqueo facial del celular usan inteligencia artificial.",
        "Una IA no entiende como una persona: encuentra patrones matemáticos en los datos con los que fue entrenada.",
        "Python es uno de los lenguajes más usados para crear inteligencia artificial."
    ];
    const caja = document.getElementById("dato-texto");
    const boton = document.getElementById("dato-otro");
    if (caja && boton) {
        let n = Math.floor(Math.random() * datos.length);
        const mostrar = () => { caja.textContent = datos[n]; };
        mostrar();
        boton.addEventListener("click", () => { n = (n + 1) % datos.length; mostrar(); });
    }
})();
