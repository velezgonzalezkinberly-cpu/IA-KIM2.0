#!/usr/bin/env python3
"""
Pruebas en navegador (Chromium headless) del carrusel «La IA en imágenes» de index.html.
Uso: python3 pruebas/probar_carrusel.py [carpeta_capturas]     (no necesita MySQL)
"""
import sys, os, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = sys.argv[1] if len(sys.argv) > 1 else "/tmp/capturas"; os.makedirs(CAP, exist_ok=True)
BASE = "http://127.0.0.1:8091"
srv = subprocess.Popen(["php", "-S", "127.0.0.1:8091", "-t", RAIZ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try: urllib.request.urlopen(BASE + "/index.html", timeout=1); break
    except Exception: time.sleep(0.2)
ok = fallos = 0
def probar(n, c, d=""):
    global ok, fallos
    if c: ok += 1; print("  OK   ", n)
    else: fallos += 1; print("  FALLA", n, d)
IDX = "(()=>[...document.querySelectorAll('.car-punto')].findIndex(b=>b.getAttribute('aria-current')==='true'))()"

with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(viewport={"width": 1100, "height": 900}); pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("response", lambda r: errs.append((r.status, r.url)) if r.status >= 400 else None)
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "ERR_NAME_NOT_RESOLVED" not in m.text else None)
    pg.goto(BASE + "/index.html"); pg.wait_for_selector("#carrusel.listo")
    print("== Contenido ==")
    probar("6 diapositivas con imagen y texto", pg.locator(".car-slide").count() == 6 and pg.locator(".car-slide figcaption h4").count() == 6)
    cargadas = pg.evaluate("[...document.querySelectorAll('.car-slide img')].map(i=>i.complete && i.naturalWidth>0)")
    probar("las 6 imágenes SVG cargaron", all(cargadas), cargadas)
    probar("6 puntos y contador '1 / 6'", pg.locator(".car-punto").count() == 6 and pg.locator(".car-contador").inner_text() == "1 / 6")
    probar("todas las imágenes tienen texto alternativo", pg.evaluate("[...document.querySelectorAll('.car-slide img')].every(i=>i.alt.length>10)"))
    pg.locator("#carrusel").scroll_into_view_if_needed(); pg.screenshot(path=CAP + "/07_carrusel_escritorio.png")

    print("== Controles ==")
    pg.click(".car-flecha.sig"); probar("flecha siguiente → imagen 2", pg.evaluate(IDX) == 1 and pg.locator(".car-contador").inner_text() == "2 / 6")
    pg.click(".car-flecha.ant"); pg.click(".car-flecha.ant"); probar("anterior desde la 1 → da la vuelta a la 6", pg.evaluate(IDX) == 5)
    pg.click(".car-flecha.sig"); probar("siguiente desde la 6 → vuelve a la 1", pg.evaluate(IDX) == 0)
    pg.click(".car-punto >> nth=3"); probar("clic en el punto 4 → imagen 4", pg.evaluate(IDX) == 3)
    pg.focus(".car-vista"); pg.keyboard.press("ArrowRight"); probar("teclado → (flecha derecha)", pg.evaluate(IDX) == 4)
    pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowLeft"); probar("teclado ← ←", pg.evaluate(IDX) == 2)
    pg.keyboard.press("End"); probar("tecla Fin → última", pg.evaluate(IDX) == 5)
    pg.keyboard.press("Home"); probar("tecla Inicio → primera", pg.evaluate(IDX) == 0)
    ocultas = pg.evaluate("[...document.querySelectorAll('.car-slide')].map(s=>s.getAttribute('aria-hidden'))")
    probar("solo la imagen visible está expuesta a lectores de pantalla", ocultas == ["false"] + ["true"] * 5, ocultas)

    print("== Avance automático ==")
    pg.mouse.move(5, 5); pg.evaluate("document.activeElement.blur()")
    pg.click(".car-punto >> nth=0"); pg.mouse.move(5, 5); pg.evaluate("document.activeElement.blur()")
    pg.wait_for_function(IDX + "===1", timeout=8000); probar("avanza solo a la imagen 2 (≈5 s)", True)
    pg.hover("#carrusel"); i0 = pg.evaluate(IDX); pg.wait_for_timeout(6000)
    probar("pausa con el mouse encima (6 s sin cambiar)", pg.evaluate(IDX) == i0)
    pg.mouse.move(5, 5); pg.evaluate("document.activeElement.blur()")
    pg.click(".car-pausa"); pg.mouse.move(5, 5); pg.evaluate("document.activeElement.blur()"); i1 = pg.evaluate(IDX); pg.wait_for_timeout(6000)
    probar("botón Pausar detiene el avance", pg.evaluate(IDX) == i1 and pg.get_attribute(".car-pausa", "aria-pressed") == "true" and "Reanudar" in pg.inner_text(".car-pausa"))
    probar("en pausa se anuncia el cambio (aria-live=polite)", pg.get_attribute(".car-pista", "aria-live") == "polite")
    pg.click(".car-pausa"); pg.mouse.move(5, 5); pg.evaluate("document.activeElement.blur()")
    pg.wait_for_function("(i=>(" + IDX + ")!==i)(%d)" % i1, timeout=8000); probar("Reanudar vuelve a avanzar", True)

    print("== Móvil y gestos ==")
    m = nav.new_context(viewport={"width": 375, "height": 800}, is_mobile=True, has_touch=True); pm = m.new_page()
    pm.goto(BASE + "/index.html"); pm.wait_for_selector("#carrusel.listo"); pm.click(".car-pausa")
    pm.locator("#carrusel").scroll_into_view_if_needed()
    probar("sin desplazamiento horizontal en 375 px", pm.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), pm.evaluate("[document.documentElement.scrollWidth, innerWidth]"))
    caja = pm.locator(".car-vista").bounding_box(); y = caja["y"] + caja["height"] / 2
    def deslizar(x1, x2):
        pm.mouse.move(x1, y); pm.mouse.down(); pm.mouse.move((x1 + x2) / 2, y, steps=4); pm.mouse.move(x2, y, steps=4); pm.mouse.up(); pm.wait_for_timeout(700)
    deslizar(caja["x"] + 300, caja["x"] + 60); probar("deslizar a la izquierda → siguiente", pm.evaluate(IDX) == 1, pm.evaluate(IDX))
    deslizar(caja["x"] + 60, caja["x"] + 300); probar("deslizar a la derecha → anterior", pm.evaluate(IDX) == 0, pm.evaluate(IDX))
    deslizar(caja["x"] + 200, caja["x"] + 180); probar("un roce corto no cambia de imagen", pm.evaluate(IDX) == 0)
    pm.screenshot(path=CAP + "/08_carrusel_movil.png"); m.close()

    print("== Menos movimiento ==")
    r = nav.new_context(viewport={"width": 1000, "height": 800}, reduced_motion="reduce"); pr = r.new_page()
    pr.goto(BASE + "/index.html"); pr.wait_for_selector("#carrusel.listo"); pr.mouse.move(5, 5); pr.wait_for_timeout(6500)
    probar("con 'reducir movimiento' no avanza solo", pr.evaluate(IDX) == 0 and "Reanudar" in pr.inner_text(".car-pausa"))
    r.close()

    print("== Sin JavaScript ==")
    s = nav.new_context(java_script_enabled=False, viewport={"width": 1000, "height": 800}); ps = s.new_page(); ps.goto(BASE + "/index.html")
    probar("sin JS las 6 imágenes siguen en la página y se pueden deslizar", ps.locator(".car-slide").count() == 6 and ps.evaluate("getComputedStyle(document.querySelector('.car-vista')).overflowX") == "auto")
    probar("sin JS no se ven botones inútiles", not ps.locator(".car-flecha.sig").is_visible() and not ps.locator(".car-barra").is_visible())
    s.close()
    probar("sin errores en consola ni 404 en index.html", not errs, errs)
    nav.close()
srv.terminate()
print("\nResultado: %d correctas, %d con falla" % (ok, fallos)); sys.exit(1 if fallos else 0)
