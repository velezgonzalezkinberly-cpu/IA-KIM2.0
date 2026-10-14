# Documentación: Memoria caché y API Cache

**Proyecto:** Inteligencia Artificial · CBTIS 260 (PWA)
**Archivos involucrados:** `service-worker.js`, `pwa.js`, `cache-panel.js`, `offline.html`, `paginas/cache.html`

---

## 1. ¿Qué se implementó?

La PWA usa **cinco cachés** (cada uno con su propio método) creados con la **Cache API** del navegador:

| Caché | Nombre | Qué guarda | Cuándo se llena |
|---|---|---|---|
| **Memoria caché** (estático) | `ia-cbtis260-estatico-v5` | Páginas HTML, CSS, JS e imágenes propias (lista `ARCHIVOS`) | Evento `install`, con `cache.addAll()` |
| **API Cache** (dinámico) | `ia-cbtis260-dinamico-v5` | Fuentes de Google, archivos nuevos y todo lo que no está en la lista | Evento `fetch`, con `cache.put()` |

| **Caché del modelo** (método 3) | `ia-cbtis260-modelo-v5` | Modelo de Teachable Machine (`modelo/`) y bibliotecas (`lib/`) | Evento `install` y, si falta algo, al usarlo |
| **Caché de páginas** (método 4) | `ia-cbtis260-paginas-v5` | Copia de cada página HTML que se abre | Evento `fetch`, cada vez que hay Internet |
| **Caché de imágenes** (método 5) | `ia-cbtis260-imagenes-v5` | Imágenes que no están en la lista inicial (p. ej. subidas desde PHP) | Evento `fetch`, con fecha y caducidad |

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
| **Modelo y bibliotecas** (`modelo/`, `lib/`) | **Cache First** (método 3): busco en `ia-cbtis260-modelo`; si está, lo entrego; si no, lo pido y lo guardo. | El modelo funciona sin Internet |
| **Páginas HTML** (navegación) | **Network First con tiempo límite** (método 4): pido la página a la red; si falla o tarda más de 3.5 s (`TIEMPO_RED`), uso la última copia guardada. | Siempre se ve lo más nuevo y, sin Internet, lo último visto |
| **Imágenes fuera de la lista** | **Cache First con caducidad** (método 5): uso la copia si tiene menos de 7 días (`DIAS_IMAGENES`); si venció la vuelvo a pedir (si no hay Internet uso la vencida). Máximo 30 (`LIMITE_IMAGENES`). | Ahorra datos sin guardar imágenes viejas para siempre |
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
| `LIMPIAR_MODELO` | Borra solo el caché del modelo |
| `LIMPIAR_PAGINAS` | Borra solo el caché de páginas |
| `LIMPIAR_IMAGENES` | Borra solo el caché de imágenes |
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
3. DevTools (F12) → **Application → Cache storage**: deben verse los cinco cachés.
4. **Application → Service Workers → Offline** y recarga: el sitio debe abrir.
5. Entra a `paginas/cache.html` y usa el panel.

## 8. Cómo actualizar la versión

Cambia en `service-worker.js`:

```js
const VERSION = "v5";   // → "v6"
```

Si agregas un archivo nuevo al sitio, añádelo también a la lista `ARCHIVOS`.

## 9. El modelo dentro de la PWA

En el menú aparece **🧠 Modelo** (`paginas/modelo.html`). Ahí se usa el modelo de Teachable Machine (clases `kinberly` y `no_kinberly`):

1. `modelo.js` carga primero el modelo guardado en `modelo/` (funciona sin Internet) y, si falla, el enlace de Teachable Machine.
2. Se elige una imagen del dispositivo o se toma una foto con la cámara.
3. `modelo.predict()` calcula la probabilidad de cada clase y se muestran con barras de porcentaje.

Los archivos del modelo se guardan en el **caché del modelo** (método 3), por eso la página funciona sin conexión después de la primera visita.
> La cámara solo funciona con HTTPS o `http://localhost`.

## 10. Archivos agregados o modificados

| Archivo | Cambio |
|---|---|
| `service-worker.js` | Cinco cachés y cinco métodos (se agregaron Cache First, Network First y Cache First con caducidad) |
| `paginas/modelo.html` | **Nuevo**: página donde se usa el modelo |
| `modelo.js` · `estilos/modelo.css` | **Nuevos**: lógica y estilos del modelo |
| `modelo/` · `lib/` | **Nuevos**: archivos del modelo y TensorFlow.js |
| `offline.html` | **Nuevo**: página de respaldo sin conexión |
| `cache-panel.js` | **Nuevo**: panel en vivo |
| `estilos/cache.css` | **Nuevo**: estilos del panel |
| `paginas/cache.html` | **Nuevo**: documentación dentro del sitio |
| `DOCUMENTACION-CACHE.md` | **Nuevo**: este documento |
| `index.html` y todas las páginas | Enlace «🧠 Modelo» en el menú (y tarjeta en el inicio) |
| `paginas/contacto.html` | Árbol del proyecto actualizado |
