#!/usr/bin/env python3
"""
Pruebas en navegador real (Chromium headless) de la sección «Algoritmos de búsqueda».
Requisitos: pip install playwright && playwright install chromium
Uso: python3 pruebas/probar_navegador.py [carpeta_capturas]
El script arranca su propio servidor PHP (php -S) con la carpeta del sitio y lo APAGA
para probar de verdad el modo sin conexión (Playwright no puede simular "offline"
dentro de un service worker). Necesita MySQL/MariaDB encendido con la BD importada.
"""
import sys, os, json, time, subprocess, signal, urllib.request
RAIZ_SITIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUERTO = 8090
BASE = "http://127.0.0.1:%d" % PUERTO
srv = None
def arrancar():
    global srv
    srv = subprocess.Popen(["php", "-S", "127.0.0.1:%d" % PUERTO, "-t", RAIZ_SITIO], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try: urllib.request.urlopen(BASE + "/api/algoritmos.php", timeout=1); return
        except Exception: time.sleep(0.2)
def apagar():
    global srv
    if srv: srv.terminate(); srv.wait(); srv = None
arrancar()
from playwright.sync_api import sync_playwright

CAP = sys.argv[1] if len(sys.argv) > 1 else "/tmp/capturas"
os.makedirs(CAP, exist_ok=True)
ok = fallos = 0
def probar(nombre, cond, det=""):
    global ok, fallos
    if cond: ok += 1; print("  OK   ", nombre)
    else: fallos += 1; print("  FALLA", nombre, det)

with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(viewport={"width": 1200, "height": 900}, service_workers="allow")
    pag = ctx.new_page()
    errores_consola, malas = [], []
    pag.on("console", lambda m: errores_consola.append(m.text) if m.type == "error" and "ERR_NAME_NOT_RESOLVED" not in m.text else None)  # las fuentes de Google no cargan sin Internet
    pag.on("pageerror", lambda e: errores_consola.append(str(e)))
    pag.on("response", lambda r: malas.append((r.status, r.url)) if r.status >= 400 and "/api/" not in r.url and "fonts.g" not in r.url else None)

    print("== Escritorio ==")
    pag.goto(BASE + "/paginas/algoritmos.html")
    pag.wait_for_selector("#alg-tbody tr.alg-fila")
    probar("la tabla muestra 14 filas leídas de la BD", pag.locator("#alg-tbody tr.alg-fila").count() == 14)
    cab = [t.strip() for t in pag.locator(".alg-tabla thead th").all_inner_texts()]
    probar("columnas: ID | Nombre del algoritmo | Clasificación | Descripción", cab == ["ID", "Nombre del algoritmo", "Clasificación", "Descripción"], cab)
    probar("primera fila ALG-01 · Búsqueda lineal", pag.locator("#alg-tbody tr.alg-fila").first.inner_text().startswith("ALG-01"))
    probar("contador '14 algoritmos'", pag.locator("#alg-contador").inner_text() == "14 algoritmos", pag.locator("#alg-contador").inner_text())
    probar("menú con la opción 'Algoritmos de búsqueda'", pag.locator("nav .nav-lista a", has_text="Algoritmos de búsqueda").count() == 1)
    probar("el menú la marca como activa", "activo" in (pag.locator("nav .nav-lista a", has_text="Algoritmos de búsqueda").get_attribute("class") or ""))
    probar("el filtro se llenó con 9 clasificaciones desde la BD", pag.locator("#alg-clasificacion option").count() == 10)
    pag.screenshot(path=CAP + "/01_escritorio.png", full_page=True)

    pag.fill("#alg-q", "hash"); pag.wait_for_function("document.querySelectorAll('#alg-tbody tr.alg-fila').length===1")
    probar("buscar 'hash' → 1 resultado (ALG-07)", "ALG-07" in pag.locator("#alg-tbody tr.alg-fila").inner_text())
    pag.fill("#alg-q", "ALG-05"); pag.wait_for_function("(()=>{const f=document.querySelectorAll('#alg-tbody tr.alg-fila');return f.length===1&&f[0].innerText.includes('ALG-05')})()")
    probar("buscar por código 'ALG-05' → Búsqueda A*", "A*" in pag.locator("#alg-tbody tr.alg-fila").inner_text())
    pag.fill("#alg-q", "busqueda de"); pag.wait_for_function("document.querySelectorAll('#alg-tbody tr.alg-fila').length>=2")
    probar("búsqueda sin acentos 'busqueda de' funciona", pag.locator("#alg-tbody tr.alg-fila").count() >= 2)
    pag.fill("#alg-q", "zzzz"); pag.wait_for_selector("#alg-vacio:not([hidden])")
    probar("sin resultados → mensaje 'No encontré algoritmos…'", "No encontré" in pag.locator("#alg-vacio").inner_text() and pag.locator("#alg-tabla-caja").is_hidden())
    pag.fill("#alg-q", ""); pag.wait_for_function("document.querySelectorAll('#alg-tbody tr.alg-fila').length===14")
    pag.select_option("#alg-clasificacion", "Búsqueda local"); pag.wait_for_function("document.querySelectorAll('#alg-tbody tr.alg-fila').length===3")
    probar("filtro 'Búsqueda local' → 3 filas", True)
    pag.select_option("#alg-clasificacion", ""); pag.wait_for_function("document.querySelectorAll('#alg-tbody tr.alg-fila').length===14")

    pag.locator(".alg-detalle-boton").nth(4).click()
    pag.wait_for_selector(".alg-fila-detalle .alg-detalle")
    det = pag.locator(".alg-fila-detalle").inner_text()
    probar("'Ver detalles' (A*) muestra complejidad y observaciones desde api/algoritmo.php", "Complejidad temporal" in det and "admisible" in det, det[:80])
    pag.screenshot(path=CAP + "/02_detalle.png", full_page=True)

    probar("sin errores en consola", not errores_consola, errores_consola)
    probar("sin 404 en archivos del sitio", not malas, malas)

    print("== Service worker y offline ==")
    pag.evaluate("navigator.serviceWorker.ready")
    pag.reload(); pag.wait_for_selector("#alg-tbody tr.alg-fila")
    controlado = pag.evaluate("!!navigator.serviceWorker.controller")
    probar("service worker activo y controlando la página", controlado)
    nombres = sorted(pag.evaluate("caches.keys()"))
    probar("cachés v6 creados (estático, modelo, páginas, API); dinámico e imágenes se crean al necesitarse", len(nombres) >= 4 and all(n.endswith("-v6") for n in nombres), nombres)
    probar("caché de la API creado", any("-api-" in n for n in nombres))
    api_guardado = pag.evaluate("caches.open('ia-cbtis260-api-v6').then(c=>c.keys()).then(k=>k.map(r=>new URL(r.url).pathname+new URL(r.url).search))")
    probar("la API quedó guardada en caché", any("algoritmos.php" in x for x in api_guardado), api_guardado)
    probar("sin banner de 'datos guardados' con Internet", pag.locator("#alg-aviso-guardado").is_hidden())

    apagar()   # servidor apagado = sin conexión real
    pag.click("#alg-recargar")
    pag.wait_for_selector("#alg-aviso-guardado:not([hidden])")
    probar("sin conexión → banner 'datos guardados… podrían no estar actualizados'", "datos guardados" in pag.locator("#alg-aviso-guardado").inner_text() and "no estar actualizados" in pag.locator("#alg-aviso-guardado").inner_text(), pag.locator("#alg-aviso-guardado").inner_text())
    probar("sin conexión → sigue mostrando los 14 algoritmos", pag.locator("#alg-tbody tr.alg-fila").count() == 14)
    pag.fill("#alg-q", "binaria"); pag.wait_for_function("(()=>{const f=document.querySelectorAll('#alg-tbody tr.alg-fila');return f.length===1&&f[0].innerText.includes('ALG-02')})()", timeout=15000)
    probar("sin conexión → la búsqueda filtra los datos guardados", "ALG-02" in pag.locator("#alg-tbody tr.alg-fila").inner_text())
    pag.screenshot(path=CAP + "/03_offline.png", full_page=True)
    pag.fill("#alg-q", "")
    pag.reload(); pag.wait_for_selector("#alg-tbody tr.alg-fila", timeout=15000)
    probar("sin conexión → la página recarga (app shell en caché) y muestra datos", pag.locator("#alg-tbody tr.alg-fila").count() == 14)
    arrancar()

    print("== Móvil (375 px) ==")
    m = nav.new_context(viewport={"width": 375, "height": 800}, is_mobile=True, has_touch=True, service_workers="block")
    pm = m.new_page(); pm.goto(BASE + "/paginas/algoritmos.html"); pm.wait_for_selector("#alg-tbody tr.alg-fila")
    probar("sin desplazamiento horizontal", pm.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), pm.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"))
    probar("cabecera de tabla oculta visualmente (modo tarjetas)", pm.evaluate("getComputedStyle(document.querySelector('.alg-tabla tr.alg-fila')).display") == "block")
    pm.screenshot(path=CAP + "/04_movil.png", full_page=False)
    m.close()

    print("== Error de conexión con el servidor (contexto limpio, sin caché) ==")
    e = nav.new_context(viewport={"width": 900, "height": 700}, service_workers="block")
    pe = e.new_page()
    e.route("**/api/algoritmos.php*", lambda r: r.fulfill(status=503, content_type="application/json; charset=utf-8", body=json.dumps({"ok": False, "error": {"codigo": "servicio_no_disponible", "mensaje": "No se pudo conectar con la base de datos. Inténtalo de nuevo en unos minutos."}})))
    pe.goto(BASE + "/paginas/algoritmos.html"); pe.wait_for_selector("#alg-error:not([hidden])")
    probar("503 del servidor → mensaje de error controlado + botón Reintentar", "No se pudo conectar" in pe.locator("#alg-error-texto").inner_text() and pe.locator("#alg-reintentar").is_visible())
    probar("no se muestran detalles internos", "SQLSTATE" not in pe.content() and "root" not in pe.locator("#alg-error").inner_text())
    pe.screenshot(path=CAP + "/05_error.png")
    e.unroute("**/api/algoritmos.php*")
    pe.click("#alg-reintentar"); pe.wait_for_selector("#alg-tbody tr.alg-fila")
    probar("al pulsar Reintentar con servidor sano, aparece la tabla", pe.locator("#alg-tbody tr.alg-fila").count() == 14)
    e.close()

    print("== Sin conexión y sin datos guardados (primera visita) ==")
    n = nav.new_context(viewport={"width": 900, "height": 700}, service_workers="block")
    pn = n.new_page(); pn.goto(BASE + "/paginas/algoritmos.html"); pn.wait_for_selector("#alg-tbody tr.alg-fila")
    apagar(); pn.click("#alg-recargar"); pn.wait_for_selector("#alg-error:not([hidden])")
    probar("error 'No hay conexión…' en vez de pantalla en blanco", "No hay conexión" in pn.locator("#alg-error-texto").inner_text(), pn.locator("#alg-error-texto").inner_text())
    n.close(); arrancar()

    print("== Escape de HTML (XSS) ==")
    x = nav.new_context(service_workers="block"); px = x.new_page()
    payload = {"ok": True, "total": 1, "cantidad": 1, "generado": "2026-01-01T00:00:00+00:00", "clasificaciones": ["<img src=x onerror=window.__xss=1>"],
               "datos": [{"id": 1, "codigo": "ALG-01", "nombre": "<img src=x onerror=window.__xss=1>", "clasificacion": "<b>x</b>", "descripcion": "<script>window.__xss=1</script>"}]}
    x.route("**/api/algoritmos.php*", lambda r: r.fulfill(status=200, content_type="application/json; charset=utf-8", body=json.dumps(payload)))
    px.goto(BASE + "/paginas/algoritmos.html"); px.wait_for_selector("#alg-tbody tr.alg-fila")
    probar("el HTML llegado de la API se muestra como texto, no se ejecuta", px.evaluate("window.__xss") is None and px.locator("#alg-tbody img").count() == 0)
    x.close()
    nav.close()
apagar()

print("\nResultado: %d correctas, %d con falla" % (ok, fallos))
sys.exit(1 if fallos else 0)
