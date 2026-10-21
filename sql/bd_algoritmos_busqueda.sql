-- =====================================================================
--  bd_algoritmos_busqueda  ·  Algoritmos de búsqueda (IA · CBTIS 260)
--  Cómo usarlo en phpMyAdmin:
--    Opción A) pestaña "Importar" > elegir este archivo > Continuar.
--    Opción B) pestaña "SQL" > pegar todo el contenido > Continuar.
--  Es seguro ejecutarlo más de una vez: no borra datos; si un registro
--  ya existe (mismo código) solo se actualiza.
--  Motor InnoDB, codificación utf8mb4 (acentos y ñ).
--
--  HOSTING COMPARTIDO (cPanel, etc.): normalmente NO te dejan crear bases con
--  CREATE DATABASE y el nombre lleva prefijo (ej. cuenta_algoritmos). En ese caso:
--  crea la base desde el panel, selecciónala en phpMyAdmin y ejecuta este script
--  SIN las dos instrucciones marcadas con "<<< QUITAR EN HOSTING".
-- =====================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS bd_algoritmos_busqueda   -- <<< QUITAR EN HOSTING
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci;

USE bd_algoritmos_busqueda;                              -- <<< QUITAR EN HOSTING

CREATE TABLE IF NOT EXISTS algoritmos (
  id                   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  codigo               VARCHAR(10)   NOT NULL,   -- ejemplo: ALG-01
  nombre               VARCHAR(120)  NOT NULL,
  clasificacion        VARCHAR(80)   NOT NULL,   -- tipo o categoría de búsqueda
  descripcion          TEXT          NOT NULL,   -- cómo funciona
  complejidad_temporal VARCHAR(400)  NULL,       -- mejor / promedio / peor caso
  complejidad_espacial VARCHAR(400)  NULL,
  observaciones        TEXT          NULL,       -- condiciones de uso y limitaciones
  fecha_creacion       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_algoritmos_codigo (codigo),
  UNIQUE KEY uq_algoritmos_nombre (nombre),
  KEY idx_algoritmos_clasificacion (clasificacion),
  CONSTRAINT chk_algoritmos_codigo CHECK (codigo REGEXP '^ALG-[0-9]{2,3}$')
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_spanish_ci
  COMMENT='Catálogo de algoritmos de búsqueda';

-- ---------------------------------------------------------------------
--  Registros iniciales (14 algoritmos concretos, sin duplicados).
--  "Búsqueda de costo mínimo" no se agrega aparte: es el mismo algoritmo
--  que la búsqueda de costo uniforme (ALG-08) y se explica en sus observaciones.
-- ---------------------------------------------------------------------
INSERT INTO algoritmos
  (codigo, nombre, clasificacion, descripcion, complejidad_temporal, complejidad_espacial, observaciones)
VALUES
('ALG-01', 'Búsqueda lineal', 'Búsqueda secuencial', 'Recorre la lista elemento por elemento, desde el primero, comparando cada uno con el valor buscado. Se detiene al encontrarlo o al llegar al final. No necesita que los datos estén ordenados y funciona con arreglos y con listas enlazadas.', 'Mejor caso: O(1), cuando el dato está en la primera posición. Caso promedio y peor caso: O(n).', 'O(1): solo usa variables auxiliares.', 'Es la opción más sencilla y sirve con datos sin ordenar o con pocos elementos. Se vuelve lenta con listas grandes. La técnica del centinela evita comprobar el límite de la lista en cada paso.'),
('ALG-02', 'Búsqueda binaria', 'Búsqueda divide y vencerás', 'Requiere una lista ordenada. Compara el valor buscado con el elemento central: si coincide termina; si es menor continúa en la mitad izquierda y si es mayor en la derecha, descartando la otra mitad en cada paso.', 'Mejor caso: O(1). Caso promedio y peor caso: O(log n).', 'O(1) en la versión iterativa; O(log n) en la recursiva por la pila de llamadas.', 'Necesita datos ordenados y acceso directo por índice (arreglos); en listas enlazadas pierde su ventaja. Ordenar antes cuesta O(n log n). Con valores repetidos puede devolver cualquiera de ellos, salvo que se adapte para hallar el primero o el último.'),
('ALG-03', 'Búsqueda en anchura (BFS)', 'Búsqueda ciega o no informada', 'Recorre un grafo o un árbol por niveles: visita el nodo inicial, luego todos sus vecinos, después los vecinos de estos y así sucesivamente. Usa una cola (FIFO) y marca los nodos visitados para no repetirlos.', 'O(V + E) en un grafo con V vértices y E aristas (lista de adyacencia). En búsqueda en árbol, con factor de ramificación b y la solución a profundidad d: O(b^d).', 'O(V) en un grafo (cola y conjunto de visitados). En búsqueda en árbol: O(b^d).', 'Es completo si el factor de ramificación es finito y encuentra la ruta con menos pasos; es óptimo en costo solo cuando todos los pasos cuestan lo mismo. Consume mucha memoria en grafos grandes.'),
('ALG-04', 'Búsqueda en profundidad (DFS)', 'Búsqueda ciega o no informada', 'Explora una rama hasta donde sea posible antes de retroceder (backtracking) y probar otra. Se implementa con una pila, explícita o mediante recursión, y conviene marcar los nodos visitados.', 'O(V + E) en un grafo. En búsqueda en árbol: O(b^m), donde m es la profundidad máxima.', 'O(V) en un grafo. En búsqueda en árbol: O(b·m), porque solo guarda la ruta actual y los hermanos pendientes.', 'No garantiza la ruta más corta (no es óptimo). Puede no terminar en espacios infinitos o con ciclos si no se controlan los nodos repetidos. Variantes: profundidad limitada y profundización iterativa. También se usa para detectar ciclos y ordenar topológicamente.'),
('ALG-05', 'Búsqueda A*', 'Búsqueda informada o heurística', 'Evalúa cada nodo con f(n) = g(n) + h(n), donde g(n) es el costo acumulado desde el inicio y h(n) es una estimación heurística del costo restante hasta la meta. Expande siempre el nodo con menor f(n) usando una cola de prioridad.', 'Peor caso: O(b^d). En la práctica depende de la calidad de la heurística.', 'O(b^d): guarda en memoria todos los nodos generados.', 'Es completo y óptimo si la heurística es admisible (nunca sobrestima el costo real) y, en búsqueda en grafos, consistente. Con h(n) = 0 equivale a la búsqueda de costo uniforme. Su principal limitación es el consumo de memoria. Se usa en rutas, videojuegos y robótica.'),
('ALG-06', 'Búsqueda voraz (Greedy)', 'Búsqueda informada o heurística', 'Elige en cada paso el nodo que parece más cercano a la meta según una heurística h(n), sin tomar en cuenta el costo ya recorrido: f(n) = h(n). También se conoce como búsqueda voraz de primero el mejor (greedy best-first).', 'Peor caso: O(b^m), con m la profundidad máxima del espacio de búsqueda. Con una buena heurística suele ser mucho menor.', 'O(b^m) en búsqueda en árbol.', 'No es óptimo y, en general, tampoco completo (puede caer en ciclos si no se controlan los repetidos). Es rápido, pero la calidad del resultado depende de la heurística. No debe confundirse con los algoritmos voraces de optimización, como Kruskal.'),
('ALG-07', 'Búsqueda hash', 'Búsqueda basada en dispersión (hashing)', 'Aplica una función hash a la clave para calcular directamente la posición donde está, o debería estar, el dato en una tabla hash. Las colisiones se resuelven con encadenamiento o con direccionamiento abierto (sondeo lineal, cuadrático o doble hash).', 'Caso promedio: O(1) con una buena función hash y un factor de carga controlado. Peor caso: O(n), cuando muchas claves colisionan.', 'O(n): la tabla almacena los n elementos.', 'No conserva el orden de los datos, por lo que no sirve para búsquedas por rango ni para obtener el mínimo o el máximo de forma eficiente. Hay que redimensionar la tabla cuando aumenta el factor de carga. Es la base de los diccionarios, los conjuntos y los índices hash.'),
('ALG-08', 'Búsqueda de costo uniforme (UCS)', 'Búsqueda por costo uniforme', 'Expande siempre el nodo con menor costo acumulado g(n) desde el origen, usando una cola de prioridad. Es la versión de Dijkstra aplicada a la búsqueda de un objetivo.', 'En búsqueda en árbol: O(b^(1 + ⌊C*/ε⌋)), donde C* es el costo de la solución óptima y ε el costo mínimo de una acción. En un grafo con cola de prioridad binaria: O((V + E) log V).', 'Del mismo orden que el tiempo en búsqueda en árbol; O(V) en un grafo.', 'Es completo y óptimo si todos los costos son positivos (mayores o iguales que ε > 0); no funciona con costos negativos. Si todos los pasos cuestan igual, se comporta como la búsqueda en anchura. No usa heurística, por lo que también es una búsqueda no informada; aquí se separa por su criterio de costo. Es el algoritmo concreto que se conoce como búsqueda de costo mínimo, por eso no se registra aparte.'),
('ALG-09', 'Búsqueda por interpolación', 'Búsqueda divide y vencerás', 'Estima la posición probable del elemento dentro de una lista ordenada a partir del valor buscado y de los valores de los extremos: pos = bajo + ((x - arr[bajo]) * (alto - bajo)) / (arr[alto] - arr[bajo]). Después ajusta el intervalo como en la búsqueda binaria.', 'Mejor caso: O(1). Caso promedio: O(log log n) si los datos están distribuidos de forma uniforme. Peor caso: O(n) con distribuciones muy desiguales.', 'O(1).', 'Requiere datos ordenados, numéricos y con acceso por índice. Supera a la binaria con distribución uniforme, pero es peor con datos muy sesgados. Se clasifica aquí por reducir el intervalo en cada paso; algunos autores la tratan como búsqueda por estimación de posición.'),
('ALG-10', 'Búsqueda exponencial', 'Búsqueda por intervalos', 'Primero localiza un intervalo que contenga el elemento, duplicando el índice (1, 2, 4, 8...) mientras el valor en esa posición sea menor que el buscado. Después aplica búsqueda binaria dentro de ese intervalo.', 'O(log i), donde i es la posición del elemento; en el peor caso, O(log n).', 'O(1) con búsqueda binaria iterativa.', 'Requiere una lista ordenada. Es útil cuando el elemento está cerca del inicio o cuando la lista es muy grande o de tamaño desconocido. Se clasifica como búsqueda por intervalos, aunque su segunda fase es de tipo divide y vencerás.'),
('ALG-11', 'Ascenso de colina (Hill Climbing)', 'Búsqueda local', 'Parte de una solución inicial y en cada iteración se mueve al vecino que mejora la función objetivo. Se detiene cuando ningún vecino ofrece una mejora.', 'Depende del problema: cada iteración evalúa el vecindario completo o una muestra de él, y el número de iteraciones no tiene una cota general.', 'O(1): solo guarda el estado actual.', 'No es completo ni óptimo: puede quedar atrapado en óptimos locales, mesetas o crestas. Variantes: con reinicio aleatorio, estocástico y de primera elección. Se usa en problemas de optimización donde importa el estado final y no el camino.'),
('ALG-12', 'Algoritmos genéticos', 'Búsqueda evolutiva o genética', 'Mantienen una población de soluciones candidatas y la mejoran generación tras generación mediante selección según una función de aptitud, cruzamiento y mutación, inspirándose en la evolución biológica.', 'Aproximadamente O(G * P * C), con G generaciones, P individuos por población y C el costo de evaluar la aptitud de un individuo.', 'O(P * L), con L la longitud de la representación (cromosoma) de cada individuo.', 'Es una metaheurística estocástica: no garantiza el óptimo ni resultados idénticos en cada ejecución. Hay que definir la codificación, la función de aptitud y los parámetros (tamaño de población, tasas de cruce y mutación). También puede verse como una búsqueda local basada en poblaciones.'),
('ALG-13', 'Recocido simulado (Simulated Annealing)', 'Búsqueda local', 'Variante estocástica del ascenso de colina inspirada en el enfriamiento de los metales. Acepta siempre un vecino mejor y, con probabilidad e^(-delta/T), también uno peor, donde delta es el empeoramiento y T la temperatura. T disminuye de forma gradual según un esquema de enfriamiento.', 'Depende del esquema de enfriamiento y del número de iteraciones; no hay una cota general.', 'O(1): guarda el estado actual y, opcionalmente, el mejor encontrado.', 'Puede escapar de óptimos locales. En teoría, con un enfriamiento suficientemente lento converge al óptimo global con probabilidad 1, pero en la práctica se usa como heurística y no lo garantiza. Es sensible a la temperatura inicial y al esquema de enfriamiento.'),
('ALG-14', 'Búsqueda de haz local (Local Beam Search)', 'Búsqueda local', 'Mantiene k estados a la vez. En cada iteración genera los sucesores de los k estados y conserva solo los k mejores del conjunto completo, de modo que las k búsquedas comparten información.', 'Depende del problema: cada iteración evalúa hasta k * b sucesores (b es el factor de ramificación) y se repite durante el número de iteraciones necesario.', 'O(k) estados en memoria, más los hasta k * b sucesores generados en cada iteración.', 'No es completo ni óptimo. Con k = 1 equivale al ascenso de colina. Los k estados pueden concentrarse en la misma región y perder diversidad; la variante estocástica elige los sucesores al azar según su calidad. La búsqueda de haz (beam search) usada en traducción automática aplica la misma idea.')
ON DUPLICATE KEY UPDATE
  nombre               = VALUES(nombre),
  clasificacion        = VALUES(clasificacion),
  descripcion          = VALUES(descripcion),
  complejidad_temporal = VALUES(complejidad_temporal),
  complejidad_espacial = VALUES(complejidad_espacial),
  observaciones        = VALUES(observaciones);

-- ---------------------------------------------------------------------
--  OPCIONAL · usuario con permisos mínimos para la aplicación.
--  Quita los "-- " del inicio, cambia la contraseña y ejecútalo.
--  (En un hosting compartido normalmente se crea desde el panel:
--   "Bases de datos MySQL" > "Usuarios" > asignar solo el permiso SELECT.)
-- ---------------------------------------------------------------------
-- CREATE USER 'usr_algoritmos'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CLAVE_POR_UNA_LARGA';
-- GRANT SELECT ON bd_algoritmos_busqueda.algoritmos TO 'usr_algoritmos'@'localhost';
-- FLUSH PRIVILEGES;
