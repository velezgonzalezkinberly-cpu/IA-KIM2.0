#!/usr/bin/env python3
"""
Pruebas de la API de algoritmos de búsqueda.
Uso:  python3 pruebas/probar_api.py http://localhost/ia-cbtis260
(la URL es la carpeta donde está el sitio; por defecto http://127.0.0.1:8080)
Solo usa la biblioteca estándar de Python.
"""
import json, sys, urllib.request, urllib.error, urllib.parse

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080").rstrip("/")
ok = fallos = 0

def pedir(ruta, metodo="GET"):
    req = urllib.request.Request(BASE + ruta, method=metodo)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()

def json_de(cuerpo):
    return json.loads(cuerpo.decode("utf-8"))

def probar(nombre, condicion, detalle=""):
    global ok, fallos
    if condicion:
        ok += 1; print("  OK   ", nombre)
    else:
        fallos += 1; print("  FALLA", nombre, detalle)

print("== Lista completa ==")
st, h, b = pedir("/api/algoritmos.php"); d = json_de(b)
probar("HTTP 200", st == 200, st)
probar("Content-Type JSON UTF-8", "application/json" in h.get("Content-Type", "") and "utf-8" in h.get("Content-Type", "").lower())
probar("14 registros", d["total"] == 14 and len(d["datos"]) == 14, d.get("total"))
probar("campos de la tabla (id, codigo, nombre, clasificacion, descripcion)", set(d["datos"][0]) == {"id","codigo","nombre","clasificacion","descripcion"})
probar("acentos correctos (Búsqueda lineal)", d["datos"][0]["nombre"] == "Búsqueda lineal", d["datos"][0]["nombre"])
probar("9 clasificaciones distintas", len(d["clasificaciones"]) == 9, d["clasificaciones"])
probar("no hay credenciales en la respuesta", all(w not in b.decode() for w in ("root", "password", "DB_PASS")))
probar("Cache-Control no-cache", "no-cache" in h.get("Cache-Control", ""))
probar("X-Content-Type-Options nosniff", h.get("X-Content-Type-Options") == "nosniff")

print("== Búsqueda ==")
d = json_de(pedir("/api/algoritmos.php?q=hash")[2])
probar("q=hash → Búsqueda hash", d["total"] == 1 and d["datos"][0]["codigo"] == "ALG-07")
d = json_de(pedir("/api/algoritmos.php?q=" + urllib.parse.quote("busqueda en"))[2])
probar("q sin acento 'busqueda en' encuentra BFS y DFS", {x["codigo"] for x in d["datos"]} >= {"ALG-03", "ALG-04"}, [x["codigo"] for x in d["datos"]])
d = json_de(pedir("/api/algoritmos.php?q=alg-1")[2])
probar("q por código 'alg-1' → ALG-10..14", [x["codigo"] for x in d["datos"]] == ["ALG-10","ALG-11","ALG-12","ALG-13","ALG-14"], [x["codigo"] for x in d["datos"]])
d = json_de(pedir("/api/algoritmos.php?q=zzzz")[2])
probar("sin resultados → ok=true, total=0, datos=[]", d["ok"] and d["total"] == 0 and d["datos"] == [])
d = json_de(pedir("/api/algoritmos.php?q=" + urllib.parse.quote("%"))[2])
probar("'%' se busca como texto (no es comodín) → 0 resultados", d["total"] == 0, d["total"])
d = json_de(pedir("/api/algoritmos.php?q=" + urllib.parse.quote("A*"))[2])
probar("q='A*' → Búsqueda A*", [x["codigo"] for x in d["datos"]] == ["ALG-05"], [x["codigo"] for x in d["datos"]])

print("== Filtro por clasificación ==")
c = urllib.parse.quote("Búsqueda local")
d = json_de(pedir("/api/algoritmos.php?clasificacion=" + c)[2])
probar("Búsqueda local → 3 (ALG-11, 13, 14)", [x["codigo"] for x in d["datos"]] == ["ALG-11","ALG-13","ALG-14"])
d = json_de(pedir("/api/algoritmos.php?clasificacion=%s&q=genet" % urllib.parse.quote("Búsqueda evolutiva o genética"))[2])
probar("clasificación + texto combinados → ALG-12", [x["codigo"] for x in d["datos"]] == ["ALG-12"], d.get("datos"))
d = json_de(pedir("/api/algoritmos.php?clasificacion=Inexistente")[2])
probar("clasificación inexistente → lista vacía", d["total"] == 0)
d = json_de(pedir("/api/algoritmos.php?limite=3&desplazamiento=2")[2])
probar("limite=3&desplazamiento=2 → ALG-03..05, total 14", [x["codigo"] for x in d["datos"]] == ["ALG-03","ALG-04","ALG-05"] and d["total"] == 14)

print("== Seguridad / validación ==")
for q in ["' OR '1'='1", "'; DROP TABLE algoritmos; --", "\" OR 1=1 #", "1 UNION SELECT user,password,3,4,5 FROM mysql.user"]:
    st, h, b = pedir("/api/algoritmos.php?q=" + urllib.parse.quote(q)); d = json_de(b)
    probar("inyección SQL inofensiva: %r" % q[:28], st == 200 and d["total"] == 0, (st, d.get("total")))
d = json_de(pedir("/api/algoritmos.php")[2])
probar("la tabla sigue intacta tras los intentos (14)", d["total"] == 14)
for ruta, etiqueta in [("/api/algoritmos.php?limite=abc", "limite=abc"), ("/api/algoritmos.php?limite=0", "limite=0"), ("/api/algoritmos.php?limite=101", "limite=101"),
                       ("/api/algoritmos.php?desplazamiento=-1", "desplazamiento=-1"), ("/api/algoritmos.php?q[]=x", "q[]=x"),
                       ("/api/algoritmos.php?q=" + "a"*101, "q de 101 caracteres"), ("/api/algoritmos.php?q=%00", "q con byte nulo"), ("/api/algoritmos.php?q=%ff%fe", "q con UTF-8 inválido")]:
    st, h, b = pedir(ruta)
    probar("400 con " + etiqueta, st == 400 and json_de(b)["error"]["codigo"] == "parametro_invalido", st)
st, h, b = pedir("/api/algoritmos.php", "POST")
probar("POST → 405 con cabecera Allow", st == 405 and "GET" in h.get("Allow", ""), st)
st, h, b = pedir("/api/algoritmos.php", "DELETE")
probar("DELETE → 405", st == 405, st)

print("== Un algoritmo por ID ==")
st, h, b = pedir("/api/algoritmo.php?id=3"); d = json_de(b)
probar("id=3 → BFS con todos los campos", st == 200 and d["dato"]["codigo"] == "ALG-03" and "complejidad_temporal" in d["dato"] and "fecha_creacion" in d["dato"], st)
probar("id numérico entero en JSON", isinstance(d["dato"]["id"], int))
d = json_de(pedir("/api/algoritmo.php?codigo=alg-05")[2])
probar("codigo=alg-05 (minúsculas) → A*", d["dato"]["nombre"] == "Búsqueda A*")
st, h, b = pedir("/api/algoritmo.php?id=9999")
probar("id inexistente → 404", st == 404 and json_de(b)["error"]["codigo"] == "no_encontrado", st)
for ruta, etiqueta in [("/api/algoritmo.php", "sin parámetros"), ("/api/algoritmo.php?id=abc", "id=abc"), ("/api/algoritmo.php?id=0", "id=0"),
                       ("/api/algoritmo.php?id=1%20OR%201=1", "id con SQL"), ("/api/algoritmo.php?codigo=XX-01", "codigo mal formado"), ("/api/algoritmo.php?id=1&codigo=ALG-01", "id y codigo juntos")]:
    st, h, b = pedir(ruta)
    probar("400 con " + etiqueta, st == 400, st)

print("\nResultado: %d correctas, %d con falla" % (ok, fallos))
sys.exit(1 if fallos else 0)
