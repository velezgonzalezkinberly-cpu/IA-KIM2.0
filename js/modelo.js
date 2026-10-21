/* =========================================================================
   modelo.js · Uso del modelo de Teachable Machine dentro de la PWA de IA
   Solo se usa en paginas/modelo.html.

   Qué hace:
     1. Carga el modelo (primero el guardado en la carpeta modelo/, que
        funciona sin Internet; si falla, el enlace de Teachable Machine).
     2. Deja elegir una imagen del dispositivo o tomar una foto con la cámara.
     3. Predice con modelo.predict() y muestra el porcentaje de cada clase.

   Las bibliotecas (lib/tf.min.js y lib/teachablemachine-image.min.js) se
   cargan antes que este archivo, desde la página.
   ========================================================================= */
(function () {
    "use strict";

    const panel = document.getElementById("panel-modelo");
    if (!panel) return;

    // ---------- 1. CONFIGURACIÓN ----------
    // La carpeta modelo/ está en la raíz del sitio (un nivel arriba de js/),
    // así que la busco a partir de la dirección de modelo.js.
    const RAIZ = document.currentScript ? document.currentScript.src : location.href;
    const MODELO_LOCAL = new URL("../modelo/", RAIZ).href;

    // Respaldo: modelo publicado en Teachable Machine (necesita Internet).
    const MODELO_REMOTO = "https://teachablemachine.withgoogle.com/models/kRgX1nPFs/";

    // Si la clase ganadora queda por debajo de este valor, aviso confianza baja.
    const UMBRAL = 0.7;
    const MAX_MB = 15;

    // Nombres bonitos para las clases del modelo (clave sin acentos ni espacios).
    const NOMBRES = {
        kinberly: "Kimberly", kimberly: "Kimberly",
        no_kinberly: "No es Kimberly", no_kimberly: "No es Kimberly",
        no_es_kimberly: "No es Kimberly"
    };

    const estado = { modelo: null, promesa: null, imagenLista: false, url: null, flujo: null, frontal: true, analizando: false };
    const $ = id => document.getElementById(id);

    // ---------- 2. UTILIDADES ----------
    function normalizar(t) {
        return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    }
    const nombreVisible = e => NOMBRES[normalizar(e)] || String(e);
    const porcentaje = p => (p * 100).toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
    const tamano = b => b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB";

    function mensaje(tipo, titulo, detalle) {
        const caja = document.createElement("div");
        caja.className = "mod-mensaje mod-mensaje--" + tipo;
        caja.setAttribute("role", tipo === "error" ? "alert" : "status");
        const strong = document.createElement("strong");
        strong.textContent = titulo;
        caja.appendChild(strong);
        if (detalle) { const p = document.createElement("p"); p.textContent = detalle; caja.appendChild(p); }
        $("mod-mensajes").appendChild(caja);
        caja.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    const limpiarMensajes = () => $("mod-mensajes").replaceChildren();

    // ---------- 3. MODELO ----------
    function pintarEstado(valor, texto) {
        $("mod-estado").dataset.estado = valor;          // cargando | listo | error
        $("mod-estado-texto").textContent = texto;
        $("mod-reintentar").hidden = valor !== "error";
    }

    function cargarDesde(base) {
        return tmImage.load(base + "model.json", base + "metadata.json");
    }

    function cargarModelo() {
        if (estado.modelo) return Promise.resolve(estado.modelo);
        if (estado.promesa) return estado.promesa;
        pintarEstado("cargando", "Cargando el modelo…");

        estado.promesa = (async () => {
            if (typeof tf === "undefined" || typeof tmImage === "undefined") {
                throw new Error("No se cargaron TensorFlow.js o Teachable Machine (carpeta lib/).");
            }
            let modelo, origen = "guardado en la app";
            try {
                modelo = await cargarDesde(MODELO_LOCAL);
            } catch (errorLocal) {
                console.warn("Modelo local no disponible, se prueba el remoto:", errorLocal);
                modelo = await cargarDesde(MODELO_REMOTO);   // si también falla, se lanza el error
                origen = "descargado de Teachable Machine";
            }
            estado.modelo = modelo;

            const nombres = modelo.getClassLabels().map(nombreVisible);
            $("mod-clases").textContent = "Clases del modelo (" + nombres.length + "): " + nombres.join(", ") + ".";
            $("mod-clases").hidden = false;
            pintarEstado("listo", "Modelo listo (" + origen + ").");
            return modelo;
        })().catch(error => {
            estado.promesa = null;                            // permite reintentar
            console.error("Error al cargar el modelo:", error);
            pintarEstado("error", "No se pudo cargar el modelo.");
            mensaje("error", "No se pudo cargar el modelo",
                "Abre el sitio con http://localhost o HTTPS (no con file://) y revisa que existan modelo/model.json, " +
                "modelo/metadata.json y modelo/weights.bin. Detalle: " + ((error && error.message) || error));
            error.notificado = true;
            throw error;
        });
        return estado.promesa;
    }

    // ---------- 4. IMAGEN ----------
    function liberarUrl() { if (estado.url) { URL.revokeObjectURL(estado.url); estado.url = null; } }

    function ocultarResultado() {
        $("mod-resultado").hidden = true;
        $("mod-resultado-vacio").hidden = false;
        $("mod-barras").replaceChildren();
    }

    function ponerImagen(url, descripcion) {
        return new Promise((resolve, reject) => {
            const img = $("mod-img");
            img.onload = () => {
                estado.imagenLista = true;
                img.hidden = false;
                $("mod-img-vacia").hidden = true;
                $("mod-pie-img").textContent = descripcion;
                $("mod-pie-img").hidden = false;
                resolve();
            };
            img.onerror = () => reject(new Error("Imagen no legible"));
            liberarUrl();
            estado.url = url;
            estado.imagenLista = false;
            img.src = url;
        });
    }

    function quitarImagen() {
        const img = $("mod-img");
        img.onload = img.onerror = null;
        img.removeAttribute("src");
        img.hidden = true;
        liberarUrl();
        estado.imagenLista = false;
        $("mod-img-vacia").hidden = false;
        $("mod-pie-img").hidden = true;
        ocultarResultado();
    }

    async function usarArchivo(archivo) {
        limpiarMensajes();
        ocultarResultado();
        if (!archivo) return;
        if (!archivo.type.startsWith("image/")) {
            quitarImagen();
            return mensaje("error", "El archivo no es una imagen", "Elige un archivo JPG, PNG o WEBP.");
        }
        if (archivo.size > MAX_MB * 1048576) {
            quitarImagen();
            return mensaje("error", "La imagen es demasiado grande", "Pesa " + tamano(archivo.size) + " y el máximo es " + MAX_MB + " MB.");
        }
        try {
            await ponerImagen(URL.createObjectURL(archivo), archivo.name + " (" + tamano(archivo.size) + ")");
        } catch (e) {
            quitarImagen();
            mensaje("error", "No se pudo abrir la imagen", "Puede estar dañada o tener un formato que el navegador no admite (por ejemplo HEIC). Prueba con JPG o PNG.");
        }
    }

    // ---------- 5. CÁMARA ----------
    function detenerCamara() {
        if (estado.flujo) { estado.flujo.getTracks().forEach(t => t.stop()); estado.flujo = null; }
        const v = $("mod-video");
        if (v) v.srcObject = null;
    }
    function cerrarCamara() { detenerCamara(); $("mod-camara").hidden = true; }

    async function abrirCamara() {
        limpiarMensajes();
        if (!window.isSecureContext) {
            return mensaje("error", "La cámara requiere conexión segura", "Abre el sitio con HTTPS o con localhost.");
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return mensaje("error", "Este navegador no permite usar la cámara", "Usa «Cargar imagen del dispositivo».");
        }
        try {
            detenerCamara();
            const flujo = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: estado.frontal ? "user" : "environment" }, audio: false
            });
            estado.flujo = flujo;
            const v = $("mod-video");
            v.dataset.espejo = String(estado.frontal);
            v.srcObject = flujo;
            $("mod-camara").hidden = false;
            await v.play();
        } catch (error) {
            cerrarCamara();
            const n = (error && error.name) || "";
            if (n === "NotAllowedError" || n === "SecurityError") {
                mensaje("error", "Permiso de cámara denegado", "Permite el acceso desde el candado junto a la dirección o usa «Cargar imagen del dispositivo».");
            } else if (n === "NotFoundError" || n === "OverconstrainedError") {
                mensaje("error", "No se encontró una cámara", "Este dispositivo no tiene cámara disponible.");
            } else if (n === "NotReadableError") {
                mensaje("error", "No se pudo usar la cámara", "Otra aplicación podría estar usándola. Ciérrala e inténtalo de nuevo.");
            } else {
                mensaje("error", "No se pudo activar la cámara", "Detalle técnico: " + (n || error));
            }
        }
    }

    function capturar() {
        const v = $("mod-video");
        if (!v.videoWidth) return mensaje("aviso", "La cámara aún no está lista", "Espera a que se vea la imagen e inténtalo otra vez.");
        const lienzo = $("mod-canvas");
        lienzo.width = v.videoWidth;
        lienzo.height = v.videoHeight;
        lienzo.getContext("2d").drawImage(v, 0, 0, lienzo.width, lienzo.height);
        lienzo.toBlob(async blob => {
            limpiarMensajes();
            ocultarResultado();
            if (!blob) return mensaje("error", "No se pudo tomar la fotografía", "Inténtalo de nuevo.");
            try {
                await ponerImagen(URL.createObjectURL(blob), "Fotografía tomada con la cámara");
                cerrarCamara();
            } catch (e) {
                quitarImagen();
                mensaje("error", "No se pudo procesar la fotografía", "Inténtalo de nuevo.");
            }
        }, "image/jpeg", 0.92);
    }

    // ---------- 6. PREDICCIÓN ----------
    function mostrarResultados(predicciones) {
        const ganadora = predicciones.reduce((a, b) => (b.probability > a.probability ? b : a));
        $("mod-ganadora").textContent = nombreVisible(ganadora.className);
        $("mod-cifra").textContent = porcentaje(ganadora.probability);

        const lista = $("mod-barras");
        lista.replaceChildren();
        predicciones.forEach(p => {
            const li = document.createElement("li");
            li.className = "mod-barra" + (p === ganadora ? " mod-barra--principal" : "");

            const fila = document.createElement("div");
            fila.className = "mod-barra__fila";
            const n = document.createElement("span"); n.textContent = nombreVisible(p.className);
            const v = document.createElement("span"); v.textContent = porcentaje(p.probability);
            fila.append(n, v);

            const pista = document.createElement("div");
            pista.className = "mod-barra__pista";
            pista.setAttribute("aria-hidden", "true");
            const relleno = document.createElement("div");
            relleno.className = "mod-barra__relleno";
            pista.appendChild(relleno);

            li.append(fila, pista);
            lista.appendChild(li);
            requestAnimationFrame(() => { relleno.style.width = (p.probability * 100).toFixed(1) + "%"; });
        });

        $("mod-resultado-vacio").hidden = true;
        $("mod-resultado").hidden = false;
        $("mod-resultado").scrollIntoView({ block: "nearest", behavior: "smooth" });

        if (ganadora.probability < UMBRAL) {
            mensaje("aviso", "Confianza baja", "La clase más probable no llega al " + Math.round(UMBRAL * 100) +
                " %. Prueba con una imagen más nítida, bien iluminada y con el rostro centrado.");
        }
    }

    async function analizar() {
        if (estado.analizando) return;
        limpiarMensajes();
        ocultarResultado();
        if (!estado.imagenLista) {
            return mensaje("aviso", "Primero elige una imagen", "Carga una imagen o toma una fotografía y después pulsa «Analizar imagen».");
        }
        const boton = $("mod-analizar");
        estado.analizando = true;
        boton.disabled = true;
        boton.textContent = "Analizando…";
        try {
            const modelo = await cargarModelo();
            const predicciones = await modelo.predict($("mod-img"));
            if (!Array.isArray(predicciones) || !predicciones.length) throw new Error("El modelo no devolvió resultados.");
            mostrarResultados(predicciones);
        } catch (error) {
            console.error("Error al analizar:", error);
            if (!error.notificado) mensaje("error", "No se pudo analizar la imagen", "Inténtalo con otra imagen. Detalle: " + ((error && error.message) || error));
        } finally {
            estado.analizando = false;
            boton.disabled = false;
            boton.textContent = "Analizar imagen";
        }
    }

    // ---------- 7. INICIO ----------
    const entrada = $("mod-archivo");
    $("mod-elegir").addEventListener("click", () => entrada.click());
    entrada.addEventListener("change", () => { usarArchivo(entrada.files && entrada.files[0]); entrada.value = ""; });
    $("mod-camara-abrir").addEventListener("click", abrirCamara);
    $("mod-capturar").addEventListener("click", capturar);
    $("mod-cambiar").addEventListener("click", () => { estado.frontal = !estado.frontal; abrirCamara(); });
    $("mod-cerrar").addEventListener("click", cerrarCamara);
    $("mod-analizar").addEventListener("click", analizar);
    $("mod-quitar").addEventListener("click", () => { limpiarMensajes(); quitarImagen(); });
    $("mod-reintentar").addEventListener("click", () => { limpiarMensajes(); cargarModelo().catch(() => {}); });
    window.addEventListener("pagehide", detenerCamara);

    // El modelo empieza a cargarse en cuanto se abre la página.
    cargarModelo().catch(() => {});
})();
