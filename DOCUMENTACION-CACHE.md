# Documentación: Memoria caché y API Cache

**Proyecto:** Inteligencia Artificial · CBTIS 260 (PWA)
**Archivos involucrados:** `service-worker.js`, `pwa.js`, `cache-panel.js`, `offline.html`, `paginas/cache.html`

---

## 1. ¿Qué se implementó?

La PWA usa **dos cachés** creados con la **Cache API** del navegador:

| Caché | Nombre | Qué guarda | Cuándo se llena |
|---|---|---|---|
| **Memoria caché** (estático) | `ia-cbtis260-estatico-v4` | Páginas HTML, CSS, JS e imágenes propias (lista `ARCHIVOS`) | Evento `install`, con `cache.addAll()` |
| **API Cache** (dinámico) | `ia-cbtis260-dinamico-v4` | Fuentes de Google, archivos nuevos y todo lo que no está en la lista | Evento `fetch`, con `cache.put()` |

El caché dinámico tiene un límite de **40 archivos** (`LIMITE_DINAMICO`). Al pasarse, se borra el más antiguo.

## 2. Ciclo de vida del service worker

1. **install** → se abre el caché estático y se guardan todos los archivos de `ARCHIVOS`. Se llama `skipWaiting()` para activar la versión nueva sin esperar.
2. **activate** → se borran todos los cachés cuyo nombre no sea el de la versión actual (`caches.keys()` + `caches.delete()`) y se toma el control con `clients.claim()`.
3. **fetch** → cada solicitud se resuelve según la estrategia de la sección 3.
4. **message** → la página puede mandar órdenes al service worker (sección 5).

## 3. Estrategias de caché

| Solicitud | Estrategia | Resultado |
|---|---|---|
| Archivo de **mi sitio** | **Stale-while-revalidate**: busco con `caches.match()`; si existe respondo al instante y en segundo plano pido la versión nueva para actualizar el caché. | Carga rápida y funciona sin Internet |
| Archivo de mi sitio **nuevo** (no está en la lista) | Se pide a la red y se guarda una copia en el caché dinámico. | Se vuelve disponible offline |
| Archivo de **otro sitio** (Google Fonts) | **Cache first**: si está en caché lo uso; si no, lo pido y lo guardo (se aceptan respuestas `opaque`). | Las fuentes funcionan offline |
| **Sin Internet y sin copia** | Páginas: `index.html` (o `offline.html`). Otros archivos: `offline.html`. | La app no se queda en blanco |
| Carpeta `php/` o métodos distintos de GET | **No se interceptan** (necesitan servidor y base de datos; la Cache API no guarda POST). | Sin caché |

> Con stale-while-revalidate, una actualización se ve en la **segunda** carga después de publicarla. Para forzar el cambio, sube `VERSION` en `service-worker.js`.

## 4. Métodos de la Cache API utilizados

| Método | Dónde se usa | Para qué |
|---|---|---|
| `caches.open(nombre)` | install, fetch, panel | Abrir o crear un caché |
| `caches.keys()` | activate, panel | Listar los cachés |
| `caches.match(peticion)` | fetch | Buscar una respuesta en todos los cachés |
| `caches.delete(nombre)` | activate, message, panel | Borrar un caché completo |
| `cache.addAll(lista)` | install | Descargar y guardar varios archivos |
| `cache.add(url)` | panel | Descargar y guardar un archivo |
| `cache.put(peticion, respuesta)` | fetch, panel | Guardar una respuesta |
| `cache.match(peticion)` | fetch, panel | Buscar en un caché específico |
| `cache.keys()` | limitarCache, panel | Listar los archivos de un caché |
| `cache.delete(peticion)` | limitarCache | Borrar un archivo del caché |

## 5. Mensajes página → service worker

```js
navigator.serviceWorker.controller.postMessage({ accion: "LIMPIAR_DINAMICO" });
```

| `accion` | Efecto |
|---|---|
| `LIMPIAR_DINAMICO` | Borra solo la API Cache |
| `LIMPIAR_TODO` | Borra todos los cachés de la app |
| `ACTIVAR` | Ejecuta `skipWaiting()` para activar una versión nueva |

## 6. Panel en vivo

La página `paginas/cache.html` (enlazada desde el inicio) incluye un panel (`cache-panel.js`) que:

- Lista los cachés y los archivos de cada uno.
- Muestra conexión, estado del service worker y almacenamiento usado (`navigator.storage.estimate()`).
- **Probar API Cache:** guarda un JSON con `cache.put()` y lo lee con `cache.match()`.
- Guarda una página elegida con `cache.add()`.
- Vacía la API Cache o todos los cachés.

## 7. Cómo probarlo

1. Abre el sitio con `http://localhost/ia-cbtis260/` (XAMPP) o HTTPS. **No funciona con `file://`.**
2. Recarga una vez para que el service worker tome el control.
3. DevTools (F12) → **Application → Cache storage**: deben verse los dos cachés.
4. **Application → Service Workers → Offline** y recarga: el sitio debe abrir.
5. Entra a `paginas/cache.html` y usa el panel.

## 8. Cómo actualizar la versión

Cambia en `service-worker.js`:

```js
const VERSION = "v4";   // → "v5"
```

Si agregas un archivo nuevo al sitio, añádelo también a la lista `ARCHIVOS`.

## 9. Archivos agregados o modificados

| Archivo | Cambio |
|---|---|
| `service-worker.js` | Reescrito: dos cachés, estrategias, límite, mensajes y comentarios |
| `offline.html` | **Nuevo**: página de respaldo sin conexión |
| `cache-panel.js` | **Nuevo**: panel en vivo |
| `estilos/cache.css` | **Nuevo**: estilos del panel |
| `paginas/cache.html` | **Nuevo**: documentación dentro del sitio |
| `DOCUMENTACION-CACHE.md` | **Nuevo**: este documento |
| `index.html` | Tarjeta de enlace a la documentación |
| `paginas/contacto.html` | Árbol del proyecto actualizado |
