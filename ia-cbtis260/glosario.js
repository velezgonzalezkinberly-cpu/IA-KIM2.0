/* =========================================================
   glosario.js · Lógica de la página del glosario (paginas/glosario.html)
   Necesita glosario-datos.js (la constante GLOSARIO) y escuchar.js
   ========================================================= */
(function () {
    "use strict";

    const RAIZ = "../";   // esta página está dentro de /paginas/, las imágenes están en la raíz
    const rejilla = document.getElementById("rejilla");
    const tabla = document.getElementById("tabla");
    const cajaTabla = document.getElementById("tabla-caja");
    const contador = document.getElementById("contador");
    const vacio = document.getElementById("vacio");
    const buscar = document.getElementById("buscar");
    const btnVista = document.getElementById("vista");
    const chips = document.getElementById("chips");

    let categoria = "Todos";
    let botonSonando = null;
    let datosGlosario = GLOSARIO.slice();

    const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const norm = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    /* ----- Chips de categorías ----- */
    function pintarCategorias() {
        const categorias = ["Todos", ...new Set(datosGlosario.map(i => i.categoria || "Otros"))];
        chips.innerHTML = categorias.map(c =>
            `<li><button type="button" data-cat="${esc(c)}" aria-pressed="${c === categoria}">${esc(c)}</button></li>`).join("");
    }
    pintarCategorias();

    /* ----- Pintar tarjetas y tabla ----- */
    function pintar(lista) {
        rejilla.innerHTML = lista.map(i => `
            <article class="glo-tarjeta">
                <div class="glo-foto">
                    <span class="glo-id" aria-hidden="true">${i.id}</span>
                    <img src="${RAIZ}${esc(i.imagen)}" alt="Imagen que representa: ${esc(i.nombre)}" loading="lazy">
                </div>
                <div class="glo-cuerpo">
                    <span class="glo-cat">${esc(i.categoria)}</span>
                    <h3>${esc(i.nombre)}</h3>
                    <p>${esc(i.definicion)}</p>
                    <p class="glo-ejemplo"><strong>Ejemplo:</strong> ${esc(i.ejemplo)}</p>
                    <button class="glo-escuchar" type="button" data-id="${i.id}" data-no-leer>🔊 Escuchar</button>
                </div>
            </article>`).join("");

        tabla.innerHTML = lista.map(i => `
            <tr><td>${i.id}</td><td><strong>${esc(i.nombre)}</strong></td><td>${esc(i.definicion)}</td>
            <td><img src="${RAIZ}${esc(i.imagen)}" alt="${esc(i.nombre)}" loading="lazy"></td></tr>`).join("");

        contador.textContent = lista.length + " de " + datosGlosario.length + " términos";
        vacio.hidden = lista.length > 0;
    }

    function filtrar() {
        const q = norm(buscar.value.trim());
        pintar(datosGlosario.filter(i =>
            (categoria === "Todos" || i.categoria === categoria) &&
            (!q || norm(i.nombre + " " + i.definicion + " " + i.ejemplo).includes(q))));
    }

    /* ----- Escuchar una tarjeta ----- */
    function reiniciarBotones() {
        document.querySelectorAll(".glo-escuchar").forEach(b => { b.classList.remove("sonando"); b.textContent = "🔊 Escuchar"; });
        botonSonando = null;
    }

    rejilla.addEventListener("click", e => {
        const b = e.target.closest(".glo-escuchar");
        if (!b) return;
        const mismo = botonSonando === b;
        window.Escuchar.detener();
        reiniciarBotones();
        if (mismo) return;
        const it = datosGlosario.find(x => x.id == b.dataset.id);
        b.classList.add("sonando");
        b.textContent = "⏹ Detener";
        botonSonando = b;
        window.Escuchar.leerTexto(
            it.nombre + ". " + it.definicion + " Por ejemplo: " + it.ejemplo,
            () => { if (botonSonando === b) reiniciarBotones(); });
    });

    /* ----- Cambiar de vista (tarjetas / tabla) ----- */
    btnVista.addEventListener("click", () => {
        const verTabla = cajaTabla.hidden;
        cajaTabla.hidden = !verTabla;
        rejilla.hidden = verTabla;
        btnVista.textContent = verTabla ? "▤ Ver como tarjetas" : "▦ Ver como tabla";
    });

    chips.addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        categoria = b.dataset.cat;
        chips.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        window.Escuchar.detener(); reiniciarBotones();
        filtrar();
    });

    buscar.addEventListener("input", () => { window.Escuchar.detener(); reiniciarBotones(); filtrar(); });

    // Carga los datos de MySQL cuando la página se abre mediante XAMPP.
    // Si no hay conexión (por ejemplo, uso sin conexión de la PWA), conserva los datos locales.
    async function cargarDesdeMySQL() {
        try {
            const respuesta = await fetch("../php/api_glosario.php", { cache: "no-store" });
            if (!respuesta.ok) throw new Error("No se pudo consultar MySQL");
            const filas = await respuesta.json();
            if (!Array.isArray(filas)) throw new Error("Respuesta no válida");
            const nombresLocales = new Set(GLOSARIO.map(i => i.nombre.trim().toLocaleLowerCase()));
            const nuevos = filas
                .filter(f => !nombresLocales.has(String(f.nombre || "").trim().toLocaleLowerCase()))
                .map(f => ({
                    id: Number(f.id),
                    nombre: f.nombre || "Sin nombre",
                    definicion: f.definicion || "",
                    imagen: f.imagen || "",
                    categoria: "Otros",
                    ejemplo: "Concepto agregado desde la base de datos local."
                }));
            // Mantiene los términos originales (con categorías y ejemplos) y agrega los nuevos de MySQL.
            datosGlosario = GLOSARIO.concat(nuevos);
            pintarCategorias();
            filtrar();
        } catch (error) {
            datosGlosario = GLOSARIO.slice();
            pintarCategorias();
            filtrar();
            console.info("Se muestran los datos locales del glosario; MySQL no está disponible.");
        }
    }

    cargarDesdeMySQL();
})();
