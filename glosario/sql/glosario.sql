-- Base de datos del glosario de Inteligencia Artificial · CBTIS 260
-- Importar en phpMyAdmin (XAMPP) o ejecutar: mysql -u root < glosario.sql
CREATE DATABASE IF NOT EXISTS ia_glosario CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE ia_glosario;

DROP TABLE IF EXISTS glosario;
CREATE TABLE glosario (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(120) NOT NULL,
  definicion  TEXT         NOT NULL,
  imagen      VARCHAR(255) NOT NULL DEFAULT '',
  creado      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO glosario (id, nombre, definicion, imagen) VALUES
(1, 'Aprendizaje Automático (Machine Learning)', 'Rama de la inteligencia artificial que permite a las computadoras aprender patrones a partir de datos y mejorar su desempeño sin tener que programar explícitamente cada regla. Se utiliza para realizar predicciones, clasificaciones y tomar decisiones basadas en información previa.', 'img/concepto-01.jpg'),
(2, 'Aprendizaje Profundo (Deep Learning)', 'Subcampo del aprendizaje automático que utiliza redes neuronales artificiales con múltiples capas para analizar grandes cantidades de datos y aprender representaciones complejas. Es fundamental en aplicaciones como reconocimiento de imágenes, reconocimiento de voz y generación de contenido.', 'img/concepto-02.jpg'),
(3, 'IA Generativa', 'Tipo de inteligencia artificial capaz de crear contenido nuevo a partir de patrones aprendidos de grandes cantidades de datos. Puede generar textos, imágenes, audio, video, código y otros contenidos en respuesta a instrucciones o solicitudes del usuario.', 'img/concepto-03.jpg'),
(4, 'Red Neuronal', 'Modelo computacional inspirado de manera simplificada en el funcionamiento de las neuronas biológicas. Está formado por nodos o neuronas artificiales organizados en capas, que procesan información y ajustan sus conexiones durante el entrenamiento para reconocer patrones y resolver problemas.', 'img/concepto-04.jpg'),
(5, 'Modelo de Lenguaje', 'Sistema de inteligencia artificial diseñado para procesar, analizar y generar lenguaje humano. Aprende relaciones y patrones entre palabras y otros elementos del lenguaje para poder realizar tareas como completar textos, responder preguntas o generar contenido.', 'img/concepto-05.jpg'),
(6, 'LLM (Large Language Model)', 'Modelo de lenguaje de gran escala entrenado con enormes cantidades de datos textuales y, dependiendo del sistema, otros tipos de información. Los LLM pueden comprender y generar texto, resumir información, traducir, responder preguntas y realizar diversas tareas lingüísticas.', 'img/concepto-06.jpg'),
(7, 'Procesamiento del Lenguaje Natural (PLN)', 'Área de la inteligencia artificial dedicada a permitir que las computadoras comprendan, interpreten, procesen y generen lenguaje humano. Se aplica en traducción automática, asistentes virtuales, análisis de sentimientos, búsqueda de información y chatbots.', 'img/concepto-07.jpg'),
(8, 'Visión Artificial', 'Tecnología de inteligencia artificial que permite a las máquinas analizar e interpretar información visual, como imágenes y videos. Puede utilizarse para identificar objetos, detectar características, inspeccionar productos o interpretar escenas.', 'img/concepto-08.jpg'),
(9, 'Aprendizaje Supervisado', 'Método de aprendizaje automático en el que el modelo se entrena utilizando datos previamente etiquetados, es decir, ejemplos en los que se conoce la respuesta correcta. A partir de estos ejemplos, aprende a realizar predicciones sobre datos nuevos.', 'img/concepto-09.jpg'),
(10, 'Aprendizaje No Supervisado', 'Método de aprendizaje automático que trabaja con datos que no tienen etiquetas o respuestas previamente establecidas. El algoritmo busca por sí mismo patrones, agrupaciones, relaciones o estructuras dentro de los datos.', 'img/concepto-10.jpg'),
(11, 'Visión por Computadora', 'Campo de la inteligencia artificial que busca que las computadoras puedan obtener información significativa a partir de imágenes y videos. Permite tareas como reconocimiento de objetos, clasificación de imágenes, detección de rostros y análisis de escenas.', 'img/concepto-11.jpg'),
(12, 'Chatbot', 'Programa diseñado para mantener conversaciones con personas mediante lenguaje natural, generalmente a través de texto o voz. Puede responder preguntas, proporcionar información, realizar determinadas tareas y ofrecer asistencia de manera automatizada.', 'img/concepto-12.jpg'),
(13, 'Gemelos Digitales', 'Representaciones digitales de objetos, sistemas, procesos o incluso entornos físicos reales. Pueden utilizar datos obtenidos del mundo real para simular, monitorear y analizar el comportamiento del elemento representado, facilitando la detección de problemas y la optimización.', 'img/concepto-13.jpg'),
(14, 'Aprendizaje por Refuerzo', 'Método de aprendizaje automático en el que un agente aprende mediante la interacción con un entorno. Recibe recompensas o penalizaciones dependiendo de sus acciones y utiliza esa experiencia para aprender estrategias que le permitan alcanzar determinados objetivos.', 'img/concepto-14.jpg'),
(15, 'IA Multimodal', 'Tipo de inteligencia artificial capaz de trabajar con diferentes modalidades de información, como texto, imágenes, audio y video, de manera combinada. Esto permite que un sistema pueda interpretar distintos tipos de información para comprender mejor una solicitud y generar respuestas más completas.', 'img/concepto-15.jpg');
