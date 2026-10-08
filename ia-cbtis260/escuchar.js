/* =========================================================
   escuchar.js · Lector en voz alta para TODA la página
   Usa la API de voz del navegador (speechSynthesis), sin internet.
   - Botón flotante 🔊 con reproducir / pausa / detener / anterior / siguiente
   - Velocidad ajustable
   - Con el panel abierto, al tocar cualquier texto se lee desde ahí
   - Expone window.Escuchar para que otras páginas lean textos sueltos
   ========================================================= */
(function () {
    "use strict";

    const sintetizador = window.speechSynthesis;
    const soportado = !!sintetizador && typeof SpeechSynthesisUtterance !== "undefined";

    // Elementos de texto que se pueden leer dentro de <main>
    const SELECTOR = "h1, h2, h3, p, li, td, th, label, figcaption, .etiqueta, .anio";

    let voz = null;           // voz en español elegida
    let cola = [];            // bloques de texto de la página
    let indice = 0;           // bloque actual
    let estado = "detenido";  // "detenido" | "leyendo" | "pausado"
    let velocidad = 1;
    let ticket = 0;           // sirve para ignorar eventos de lecturas canceladas
    let actual = null;        // elemento resaltado
    let ui = {};

    /* ---------- Voz ---------- */
    function elegirVoz() {
        const voces = sintetizador.getVoices();
        voz = voces.find(v => /^es[-_]MX/i.test(v.lang)) ||
              voces.find(v => /^es[-_]US/i.test(v.lang)) ||
              voces.find(v => /^es/i.test(v.lang)) || null;
    }

    function limpiarTexto(t) {
        return t
            .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function crearVoz(texto) {
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = voz ? voz.lang : "es-MX";
        if (voz) u.voice = voz;
        u.rate = velocidad;
        return u;
    }

    /* ---------- Bloques de la página ---------- */
    function recolectar() {
        const main = document.querySelector("main");
        if (!main) return [];
        return Array.from(main.querySelectorAll(SELECTOR))
            .filter(el => !el.closest("[data-no-leer]"))
            .filter(el => !el.querySelector(SELECTOR))          // si tiene hijos de texto, se leen los hijos
            .filter(el => el.getClientRects().length > 0)        // solo lo visible
            .map(el => ({ el, texto: limpiarTexto(el.innerText || "") }))
            .filter(b => b.texto.length > 1);
    }

    function marcar(el) {
        if (actual) actual.classList.remove("leyendo");
        actual = el || null;
        if (actual) {
            actual.classList.add("leyendo");
            actual.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    /* ---------- Control de lectura ---------- */
    function detenerTodo() {
        ticket++;
        if (soportado) sintetizador.cancel();
        marcar(null);
        estado = "detenido";
        indice = 0;
        actualizarUI();
    }

    function hablarBloque(mio) {
        if (mio !== ticket) return;
        if (indice >= cola.length) { detenerTodo(); return; }
        const bloque = cola[indice];
        marcar(bloque.el);
        const u = crearVoz(bloque.texto);
        u.onend = () => { if (mio !== ticket) return; indice++; hablarBloque(mio); };
        u.onerror = e => {
            if (mio !== ticket) return;
            if (e.error === "canceled" || e.error === "interrupted") return;
            indice++; hablarBloque(mio);
        };
        sintetizador.speak(u);
        actualizarUI();
    }

    function leerDesde(n) {
        if (!soportado) return;
        if (!cola.length || estado === "detenido") cola = recolectar();
        if (!cola.length) return;
        ticket++;
        const mio = ticket;
        sintetizador.cancel();
        indice = Math.max(0, Math.min(n, cola.length - 1));
        estado = "leyendo";
        actualizarUI();
        // Pequeña pausa: algunos navegadores ignoran speak() justo después de cancel()
        setTimeout(() => hablarBloque(mio), 80);
    }

    function pausar() {
        if (estado !== "leyendo") return;
        ticket++;                       // se ignoran los eventos de la lectura en curso
        sintetizador.cancel();
        estado = "pausado";
        actualizarUI();
    }

    function alternar() {
        if (estado === "leyendo") pausar();
        else if (estado === "pausado") leerDesde(indice);
        else { cola = recolectar(); leerDesde(0); }
    }

    /* ---------- Interfaz ---------- */
    function actualizarUI() {
        if (!ui.raiz) return;
        ui.raiz.classList.toggle("sonando", estado === "leyendo");
        ui.play.textContent = estado === "leyendo" ? "⏸" : "▶";
        ui.play.setAttribute("aria-label", estado === "leyendo" ? "Pausar" : "Reproducir");
        const total = cola.length;
        ui.estado.textContent =
            estado === "leyendo" ? "Leyendo " + (indice + 1) + " de " + total :
            estado === "pausado" ? "En pausa (" + (indice + 1) + " de " + total + ")" :
            "Listo para leer esta página";
    }

    function abrirCerrar(abrir) {
        ui.panel.hidden = !abrir;
        ui.fab.setAttribute("aria-expanded", String(abrir));
        document.body.classList.toggle("modo-escucha", abrir);
        if (!abrir) detenerTodo();
    }

    function construirUI() {
        const raiz = document.createElement("div");
        raiz.className = "escuchar";
        raiz.setAttribute("data-no-leer", "");
        raiz.innerHTML =
            '<div class="escuchar-panel" role="region" aria-label="Lector en voz alta" hidden>' +
                '<p class="escuchar-titulo">🔊 Escuchar esta página</p>' +
                '<p class="escuchar-estado" aria-live="polite"></p>' +
                '<div class="escuchar-botones">' +
                    '<button type="button" data-acc="ant" aria-label="Anterior" title="Anterior">⏮</button>' +
                    '<button type="button" data-acc="play" class="principal" aria-label="Reproducir" title="Reproducir / pausar">▶</button>' +
                    '<button type="button" data-acc="stop" aria-label="Detener" title="Detener">⏹</button>' +
                    '<button type="button" data-acc="sig" aria-label="Siguiente" title="Siguiente">⏭</button>' +
                '</div>' +
                '<div class="escuchar-vel"><label for="escuchar-vel">Velocidad</label>' +
                    '<select id="escuchar-vel">' +
                        '<option value="0.8">Lenta</option><option value="1" selected>Normal</option>' +
                        '<option value="1.25">Rápida</option><option value="1.5">Muy rápida</option>' +
                    '</select></div>' +
                '<p class="escuchar-ayuda">Toca cualquier texto de la página para escuchar desde ahí.</p>' +
            '</div>' +
            '<button type="button" class="escuchar-fab" aria-expanded="false" aria-label="Abrir lector en voz alta" title="Escuchar esta página">🔊</button>';
        document.body.appendChild(raiz);

        ui = {
            raiz,
            panel: raiz.querySelector(".escuchar-panel"),
            fab: raiz.querySelector(".escuchar-fab"),
            estado: raiz.querySelector(".escuchar-estado"),
            play: raiz.querySelector('[data-acc="play"]')
        };

        ui.fab.addEventListener("click", () => abrirCerrar(ui.panel.hidden));
        raiz.querySelector(".escuchar-botones").addEventListener("click", e => {
            const b = e.target.closest("button");
            if (!b) return;
            const acc = b.dataset.acc;
            if (acc === "play") alternar();
            if (acc === "stop") detenerTodo();
            if (acc === "ant") leerDesde(estado === "detenido" ? 0 : indice - 1);
            if (acc === "sig") leerDesde(estado === "detenido" ? 0 : indice + 1);
        });
        raiz.querySelector("select").addEventListener("change", e => {
            velocidad = parseFloat(e.target.value) || 1;
            if (estado === "leyendo") leerDesde(indice);
        });

        // Con el panel abierto, tocar un texto lo lee desde ahí
        document.addEventListener("click", e => {
            if (ui.panel.hidden) return;
            if (e.target.closest("a, button, input, select, textarea, summary, .escuchar")) return;
            const el = e.target.closest(SELECTOR);
            if (!el || !el.closest("main")) return;
            cola = recolectar();
            let pos = cola.findIndex(b => b.el === el);
            if (pos < 0) pos = cola.findIndex(b => b.el.contains(el) || el.contains(b.el));
            if (pos >= 0) leerDesde(pos);
        });

        actualizarUI();
    }

    /* ---------- API pública (la usa el glosario para leer una tarjeta) ---------- */
    window.Escuchar = {
        soportado,
        leerTexto(texto, alTerminar) {
            if (!soportado) { alert("Tu navegador no soporta lectura en voz alta."); return; }
            ticket++;
            const mio = ticket;
            sintetizador.cancel();
            marcar(null);
            estado = "detenido";
            actualizarUI();
            const u = crearVoz(limpiarTexto(texto));
            const fin = () => { if (mio === ticket && alTerminar) alTerminar(); };
            u.onend = fin;
            u.onerror = fin;
            setTimeout(() => { if (mio === ticket) sintetizador.speak(u); }, 80);
        },
        detener() { ticket++; if (soportado) sintetizador.cancel(); marcar(null); estado = "detenido"; actualizarUI(); }
    };

    if (!soportado) return;
    elegirVoz();
    sintetizador.addEventListener("voiceschanged", elegirVoz);
    window.addEventListener("pagehide", () => sintetizador.cancel());
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", construirUI);
    else construirUI();
})();
