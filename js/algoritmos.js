/* =========================================================
   algoritmos.js · Sección «Algoritmos de búsqueda» (paginas/algoritmos.html)
   Flujo: página → fetch() → api/algoritmos.php (PHP + PDO) → MySQL → JSON → tabla.
   Nada de los datos está escrito aquí: todo viene de la base de datos.
   Sin conexión, el service worker entrega la última respuesta guardada y
   marca la respuesta con la cabecera X-Desde-Cache; aquí se avisa al usuario.
   ========================================================= */
(function () {
    "use strict";

    const app = document.getElementById("alg-app");
    if (!app) return;

    // La API está en ../api/ respecto a este archivo (js/).
    const RAIZ_SCRIPT = document.currentScript ? document.currentScript.src : location.href;
    const URL_LISTA = new URL("../api/algoritmos.php", RAIZ_SCRIPT);
    const URL_UNO = new URL("../api/algoritmo.php", RAIZ_SCRIPT);

    const $ = id => document.getElementById(id);
    const ui = {
        q: $("alg-q"), clasif: $("alg-clasificacion"), recargar: $("alg-recargar"),
        guardado: $("alg-aviso-guardado"), error: $("alg-error"), errorTexto: $("alg-error-texto"), reintentar: $("alg-reintentar"),
        contador: $("alg-contador"), cargando: $("alg-cargando"), caja: $("alg-tabla-caja"), tbody: $("alg-tbody"), vacio: $("alg-vacio")
    };

    let controlador = null;      // para cancelar una consulta anterior si llega otra
    let temporizador = null;     // retraso (debounce) al escribir
    const detalles = new Map();  // id → datos ya consultados

    const fechaLegible = iso => {
        const d = new Date(iso);
        return isNaN(d) ? "una fecha anterior" :
            new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d);
    };
    const sinAcentos = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // ---------- Estado visual ----------
    function mostrar(estado) {
        ui.cargando.hidden = estado !== "cargando";
        ui.caja.hidden = estado !== "tabla";
        ui.vacio.hidden = estado !== "vacio";
        ui.error.hidden = estado !== "error";
        app.setAttribute("aria-busy", estado === "cargando" ? "true" : "false");
    }

    // ---------- Llamada a la API ----------
    // Devuelve { datos, desdeCache } o lanza Error con .codigo y .mensaje
    async function pedir(url, senal) {
        let respuesta;
        try {
            respuesta = await fetch(url, { headers: { Accept: "application/json" }, signal: senal });
        } catch (e) {
            if (e.name === "AbortError") throw e;
            const err = new Error("Sin conexión"); err.codigo = "sin_conexion"; throw err;
        }
        let cuerpo = null;
        try { cuerpo = await respuesta.json(); } catch (e) { /* respuesta que no es JSON */ }
        if (!respuesta.ok || !cuerpo || cuerpo.ok !== true) {
            const err = new Error((cuerpo && cuerpo.error && cuerpo.error.mensaje) || "El servidor respondió con un error (" + respuesta.status + ").");
            err.codigo = (cuerpo && cuerpo.error && cuerpo.error.codigo) || "error_servidor";
            throw err;
        }
        return { datos: cuerpo, desdeCache: respuesta.headers.get("X-Desde-Cache") === "1" };
    }

    function parametros() {
        const u = new URL(URL_LISTA);
        const q = ui.q.value.trim();
        if (q) u.searchParams.set("q", q);
        if (ui.clasif.value) u.searchParams.set("clasificacion", ui.clasif.value);
        return u;
    }

    async function cargar() {
        // Abierta con doble clic (file://) no hay servidor: PHP y MySQL no pueden responder.
        if (location.protocol === "file:") {
            ui.errorTexto.textContent = "Abriste esta página como archivo (file://). Para que funcione la base de datos debes abrirla desde el servidor: " +
                "enciende Apache y MySQL en XAMPP, copia el proyecto a C:\\xampp\\htdocs\\ia-cbtis260 y entra a http://localhost/ia-cbtis260/paginas/algoritmos.html";
            mostrar("error");
            return;
        }
        if (controlador) controlador.abort();
        controlador = new AbortController();
        const senal = controlador.signal;

        mostrar("cargando");
        ui.guardado.hidden = true;
        ui.contador.textContent = "";

        try {
            let resultado;
            try {
                resultado = await pedir(parametros(), senal);
            } catch (e) {
                // Sin conexión con filtros: intento la lista completa guardada y filtro aquí mismo.
                if (e.codigo !== "sin_conexion" || (!ui.q.value.trim() && !ui.clasif.value)) throw e;
                const completa = await pedir(URL_LISTA, senal);
                resultado = filtrarLocal(completa);
            }
            if (senal.aborted) return;
            pintar(resultado.datos);
            if (resultado.desdeCache) {
                ui.guardado.textContent = "Sin conexión con el servidor: estás viendo datos guardados el " +
                    fechaLegible(resultado.datos.generado) + ". Podrían no estar actualizados.";
                ui.guardado.hidden = false;
            }
        } catch (e) {
            if (e.name === "AbortError") return;
            ui.errorTexto.textContent = mensajeError(e);
            mostrar("error");
        }
    }

    function mensajeError(e) {
        if (e.codigo === "sin_conexion") return "No hay conexión con el servidor y todavía no hay datos guardados en este dispositivo. Conéctate a Internet e inténtalo de nuevo.";
        return e.message || "No se pudo consultar la información.";
    }

    // Filtro local (solo se usa sin conexión, sobre la última lista guardada).
    function filtrarLocal(resultado) {
        const q = sinAcentos(ui.q.value.trim());
        const c = ui.clasif.value;
        const datos = resultado.datos.datos.filter(a =>
            (!q || sinAcentos(a.nombre).includes(q) || sinAcentos(a.codigo).includes(q)) &&
            (!c || sinAcentos(a.clasificacion) === sinAcentos(c)));
        return { desdeCache: true, datos: Object.assign({}, resultado.datos, { datos, total: datos.length, cantidad: datos.length }) };
    }

    // ---------- Dibujar ----------
    function llenarClasificaciones(lista) {
        const actual = ui.clasif.value;
        const ya = Array.from(ui.clasif.options).slice(1).map(o => o.value);
        if (lista.length === ya.length && lista.every((v, i) => v === ya[i])) return;
        while (ui.clasif.options.length > 1) ui.clasif.remove(1);
        lista.forEach(nombre => {
            const o = document.createElement("option");
            o.value = nombre; o.textContent = nombre;   // textContent: se escapa solo
            ui.clasif.appendChild(o);
        });
        ui.clasif.value = lista.includes(actual) ? actual : "";
    }

    function celda(clase, etiqueta) {
        const td = document.createElement("td");
        if (clase) td.className = clase;
        td.dataset.etiqueta = etiqueta;   // la usa el CSS móvil
        return td;
    }

    function pintar(d) {
        llenarClasificaciones(d.clasificaciones || []);
        ui.tbody.textContent = "";
        const filtrando = ui.q.value.trim() || ui.clasif.value;
        ui.contador.textContent = d.total === 1 ? "1 algoritmo" + (filtrando ? " encontrado" : "")
            : d.total + " algoritmos" + (filtrando ? " encontrados" : "");

        if (!d.datos.length) { mostrar("vacio"); return; }

        d.datos.forEach(a => {
            const fila = document.createElement("tr");
            fila.className = "alg-fila";

            const tdId = celda("alg-id", "ID"); tdId.textContent = a.codigo;
            const tdNombre = celda("alg-nombre", "Nombre del algoritmo"); tdNombre.textContent = a.nombre;
            const tdClasif = celda("", "Clasificación");
            const etiqueta = document.createElement("span"); etiqueta.className = "alg-etiqueta"; etiqueta.textContent = a.clasificacion;
            tdClasif.appendChild(etiqueta);

            const tdDesc = celda("", "Descripción");
            const p = document.createElement("span"); p.textContent = a.descripcion; tdDesc.appendChild(p);
            tdDesc.appendChild(document.createElement("br"));
            const boton = document.createElement("button");
            boton.type = "button"; boton.className = "alg-detalle-boton"; boton.dataset.noLeer = "";
            boton.setAttribute("aria-expanded", "false");
            boton.textContent = "▸ Ver detalles";
            boton.addEventListener("click", () => alternarDetalle(a, fila, boton));
            tdDesc.appendChild(boton);

            fila.append(tdId, tdNombre, tdClasif, tdDesc);
            ui.tbody.appendChild(fila);
        });
        mostrar("tabla");
    }

    // ---------- Detalle de un algoritmo (api/algoritmo.php) ----------
    async function alternarDetalle(a, fila, boton) {
        const existente = fila.nextElementSibling;
        if (existente && existente.classList.contains("alg-fila-detalle")) {
            const abrir = existente.hidden;
            existente.hidden = !abrir;
            boton.setAttribute("aria-expanded", String(abrir));
            boton.textContent = (abrir ? "▾ Ocultar detalles" : "▸ Ver detalles");
            return;
        }
        const filaDet = document.createElement("tr");
        filaDet.className = "alg-fila-detalle";
        const td = document.createElement("td"); td.colSpan = 4;
        filaDet.appendChild(td);
        fila.after(filaDet);
        boton.setAttribute("aria-expanded", "true");
        boton.textContent = "▾ Ocultar detalles";
        td.textContent = "Consultando…";

        try {
            let dato = detalles.get(a.id);
            if (!dato) {
                const u = new URL(URL_UNO); u.searchParams.set("id", String(a.id));
                const r = await pedir(u);
                dato = r.datos.dato; detalles.set(a.id, dato);
            }
            td.textContent = "";
            const caja = document.createElement("div"); caja.className = "alg-detalle";
            [["Complejidad temporal", dato.complejidad_temporal, false],
             ["Complejidad espacial", dato.complejidad_espacial, false],
             ["Observaciones", dato.observaciones, true]].forEach(([titulo, texto, ancho]) => {
                const bloque = document.createElement("div"); if (ancho) bloque.className = "alg-ancho";
                const h = document.createElement("h4"); h.textContent = titulo;
                const t = document.createElement("p"); t.textContent = texto || "No aplica.";
                bloque.append(h, t); caja.appendChild(bloque);
            });
            td.appendChild(caja);
        } catch (e) {
            td.textContent = e.codigo === "sin_conexion"
                ? "Estos detalles todavía no están guardados en el dispositivo. Conéctate a Internet para verlos."
                : (e.message || "No se pudieron cargar los detalles.");
        }
    }

    // ---------- Eventos ----------
    ui.q.addEventListener("input", () => { clearTimeout(temporizador); temporizador = setTimeout(cargar, 300); });
    ui.clasif.addEventListener("change", cargar);
    ui.recargar.addEventListener("click", cargar);
    ui.reintentar.addEventListener("click", cargar);
    // Al recuperar la conexión se actualiza sola la lista.
    window.addEventListener("online", cargar);

    cargar();
})();
