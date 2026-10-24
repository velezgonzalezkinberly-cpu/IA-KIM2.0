/* =========================================================
   carrusel.js · Carrusel de imágenes «La IA en imágenes» (index.html)
   JavaScript puro, sin librerías. Funciones:
   · Botones anterior/siguiente, puntos y contador «2 / 6».
   · Avance automático (data-intervalo, en milisegundos) con barra de progreso.
   · Se pausa al pasar el mouse, al enfocar un control, al cambiar de pestaña
     y con el botón «Pausar». Si la persona prefiere menos movimiento, empieza en pausa.
   · Gestos: deslizar con el dedo o arrastrar con el mouse.
   · Teclado: flechas ← →, Inicio y Fin.
   · Accesible: roles ARIA y anuncio de la imagen actual cuando no hay autoplay.
   Las imágenes y los textos están en el HTML (sin JavaScript se puede deslizar igual).
   ========================================================= */
(function () {
    "use strict";

    const car = document.getElementById("carrusel");
    if (!car) return;

    const vista = car.querySelector(".car-vista");
    const pista = car.querySelector(".car-pista");
    const slides = Array.from(pista.children);
    const total = slides.length;
    if (total < 2) return;

    const prev = car.querySelector(".car-flecha.ant");
    const next = car.querySelector(".car-flecha.sig");
    const btnPausa = car.querySelector(".car-pausa");
    const contador = car.querySelector(".car-contador");
    const puntos = car.querySelector(".car-puntos");
    const progreso = car.querySelector(".car-progreso");

    const INTERVALO = Math.max(2000, Number(car.dataset.intervalo) || 5000);
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let actual = 0;
    let pausadoPorUsuario = prefiereMenosMovimiento;   // el usuario (o su sistema) apagó el autoplay
    let pausadoTemporal = false;                       // mouse encima, foco dentro o pestaña oculta
    let temporizador = null;

    car.classList.add("listo");
    car.style.setProperty("--intervalo", INTERVALO + "ms");

    // ----- Puntos -----
    const botonesPunto = slides.map((slide, i) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "car-punto";
        b.dataset.noLeer = "";
        const titulo = slide.querySelector("h4");
        b.setAttribute("aria-label", "Ir a la imagen " + (i + 1) + (titulo ? ": " + titulo.textContent : ""));
        b.addEventListener("click", () => ir(i, true));
        puntos.appendChild(b);
        return b;
    });

    slides.forEach((s, i) => {
        s.setAttribute("role", "group");
        s.setAttribute("aria-roledescription", "diapositiva");
        s.setAttribute("aria-label", (i + 1) + " de " + total);
    });

    // ----- Navegación -----
    function ir(i, porUsuario) {
        actual = (i + total) % total;
        pista.style.transform = "translateX(" + (-actual * 100) + "%)";
        slides.forEach((s, k) => s.setAttribute("aria-hidden", k === actual ? "false" : "true"));
        botonesPunto.forEach((b, k) => b.setAttribute("aria-current", k === actual ? "true" : "false"));
        contador.textContent = (actual + 1) + " / " + total;
        programar();
        return porUsuario;
    }

    // ----- Autoplay -----
    function autoplayActivo() { return !pausadoPorUsuario && !pausadoTemporal; }

    function reiniciarBarra() {
        if (!progreso) return;
        progreso.classList.remove("corre");
        void progreso.offsetWidth;               // fuerza a reiniciar la animación
        if (!pausadoPorUsuario) progreso.classList.add("corre");
    }

    function programar() {
        clearTimeout(temporizador);
        reiniciarBarra();
        car.classList.toggle("en-pausa", !autoplayActivo());
        if (autoplayActivo()) temporizador = setTimeout(() => ir(actual + 1), INTERVALO);
    }

    function actualizarBotonPausa() {
        btnPausa.setAttribute("aria-pressed", String(pausadoPorUsuario));
        btnPausa.setAttribute("aria-label", pausadoPorUsuario ? "Reanudar el avance automático" : "Pausar el avance automático");
        btnPausa.textContent = pausadoPorUsuario ? "▶ Reanudar" : "⏸ Pausar";
        // Con autoplay apagado se anuncia cada cambio a lectores de pantalla.
        pista.setAttribute("aria-live", pausadoPorUsuario ? "polite" : "off");
    }

    btnPausa.addEventListener("click", () => { pausadoPorUsuario = !pausadoPorUsuario; actualizarBotonPausa(); programar(); });

    car.addEventListener("mouseenter", () => { pausadoTemporal = true; programar(); });
    car.addEventListener("mouseleave", () => { pausadoTemporal = false; programar(); });
    car.addEventListener("focusin", () => { pausadoTemporal = true; programar(); });
    car.addEventListener("focusout", () => { pausadoTemporal = false; programar(); });
    document.addEventListener("visibilitychange", () => { pausadoTemporal = document.hidden; programar(); });

    prev.addEventListener("click", () => ir(actual - 1, true));
    next.addEventListener("click", () => ir(actual + 1, true));

    // ----- Teclado -----
    car.addEventListener("keydown", e => {
        if (e.key === "ArrowLeft") { e.preventDefault(); ir(actual - 1, true); }
        else if (e.key === "ArrowRight") { e.preventDefault(); ir(actual + 1, true); }
        else if (e.key === "Home") { e.preventDefault(); ir(0, true); }
        else if (e.key === "End") { e.preventDefault(); ir(total - 1, true); }
    });

    // ----- Gestos (dedo o mouse) -----
    let inicioX = null, inicioY = null, arrastre = 0;
    vista.addEventListener("pointerdown", e => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        inicioX = e.clientX; inicioY = e.clientY; arrastre = 0;
        car.classList.add("arrastrando");
    });
    vista.addEventListener("pointermove", e => {
        if (inicioX === null) return;
        const dx = e.clientX - inicioX, dy = e.clientY - inicioY;
        if (Math.abs(dx) < Math.abs(dy)) return;   // gesto vertical: dejo que la página se desplace
        arrastre = dx;
        const ancho = vista.clientWidth || 1;
        pista.style.transform = "translateX(calc(" + (-actual * 100) + "% + " + dx + "px))";
        if (Math.abs(dx) > ancho) arrastre = Math.sign(dx) * ancho;
    });
    function soltar() {
        if (inicioX === null) return;
        const umbral = Math.min(80, (vista.clientWidth || 300) * 0.15);
        const movido = arrastre;
        inicioX = null; arrastre = 0;
        car.classList.remove("arrastrando");
        if (movido <= -umbral) ir(actual + 1, true);
        else if (movido >= umbral) ir(actual - 1, true);
        else ir(actual, true);     // vuelve a su sitio
    }
    vista.addEventListener("pointerup", soltar);
    vista.addEventListener("pointercancel", soltar);
    vista.addEventListener("pointerleave", () => { if (inicioX !== null) soltar(); });

    // ----- Inicio -----
    actualizarBotonPausa();
    ir(0);
})();
