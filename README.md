# Campuslands · Fundamentos de Simulación de Personalidades (Estación Personas)

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Guía%20interactiva-6b3fe0)](https://anndreloopez012.github.io/campuslands-simulacion-personalidades-interactivo/)
[![HyperFrames](https://img.shields.io/badge/HyperFrames-7%20videos%20explicativos-6b3fe0)](motion/explicadores)
[![Big Five](https://img.shields.io/badge/Big%20Five-OCEAN-f26b1d)](#ruta-de-aprendizaje)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B%20ESM-339933?logo=node.js&logoColor=white)](laboratorios/agente-personalidad)

Guía teórico-práctica **interactiva** de *Inteligencia Artificial II* para aprender a darle una personalidad a un agente de IA: qué significa simularla (y qué no), los dos pilares de un asistente eficaz, el **modelo de los Cinco Grandes (Big Five)**, cómo convertir rasgos en un prompt y cómo diseñar agentes empresariales de Recursos Humanos y Finanzas.

**Guía publicada:** [anndreloopez012.github.io/campuslands-simulacion-personalidades-interactivo](https://anndreloopez012.github.io/campuslands-simulacion-personalidades-interactivo/)

Basada en la presentación «Fundamentos de Simulación de Personalidades» (Inteligencia Artificial II, Eduin Salas Viloria, Campuslands).

---

## Qué incluye

- **Página interactiva** (`index.html`, `styles.css`, `app.js`): 10 estaciones con progreso, XP, cronómetro de 60 minutos y modo proyector para la clase. Misma base visual que las demás guías de Campuslands.
- **7 videos explicativos animados con HyperFrames**, uno por concepto (estaciones 01 a 07), en «modo maestro»: pregunta, analogía, pizarra paso a paso con subtítulos e idea clave. Cada video tiene capítulos para saltar a un paso y modo pantalla grande.
- **6 simuladores que funcionan sin clave**:
  - *¿Mito o realidad?*: qué es y qué no es simular una personalidad.
  - *Enciende y apaga los pilares*: la misma pregunta con y sin conocimiento del dominio y habilidades comunicativas.
  - *Rueda OCEAN*: cada rasgo con sus extremos alto y bajo y su efecto en un agente.
  - *¿Qué rasgo buscarías?*: puestos de trabajo y el rasgo que más pesa.
  - *Mezclador de personalidad*: cinco perillas (BAJA, MEDIA, ALTA) que generan el prompt de la clase y una respuesta donde cada frase se subraya con el color del rasgo que la produjo. Modo comparación para cambiar un solo rasgo.
  - *Misma pregunta, dos agentes*: HR Agent contra Finance Agent.
- **Ejercicio evaluable** (estación 07): el Camper elige un caso (mentor de programación, seguridad y riesgos, asesor de ventas o finanzas), ajusta los rasgos y completa la ficha. Un evaluador da puntaje sobre 100 con retroalimentación por rasgo y, desde 80 puntos, permite descargar `persona.json` y la ficha `.md` para la entrega.
- **Laboratorio en Node.js** (`laboratorios/agente-personalidad`): agente de consola que lee un `persona.json`, arma el prompt de sistema y conversa. Modo simulado sin clave; con `ANTHROPIC_API_KEY` u `OPENAI_API_KEY` usa un modelo real. 7 pruebas con `node:test`.
- Reto final de 10 preguntas, glosario con buscador y referencias.

> **Sin credenciales por defecto.** Toda la página y el laboratorio funcionan sin clave. Para probar con un modelo real sin programar basta con la cuenta de Claude, ChatGPT o Gemini (estación 08). Las claves de API generan cargos por tokens; una suscripción de chat no incluye la API.

---

## Ruta de aprendizaje

| Estación | Tema | Resultado |
|---|---|---|
| 00 | Bienvenida | Resultados de aprendizaje RA 1–RA 6 |
| 01 | ¿Qué es simular? | Representación lingüística y conductual, sin emociones ni conciencia |
| 02 | Asistente eficaz | Conocimiento del dominio + habilidades comunicativas |
| 03 | Los Cinco Grandes | Apertura, Responsabilidad, Extraversión, Amabilidad y Neuroticismo |
| 04 | Rasgos y trabajo | Qué rasgo destaca en cada rol |
| 05 | Mezclador | Del nivel de cada rasgo al prompt |
| 06 | Agentes empresariales | HR Agent (amigable y empático) y Finance Agent (preciso y formal) |
| 07 | Ejercicio | Diseña el agente que la empresa necesita (rúbrica y entrega) |
| 08 | Laboratorio | Pruébalo con un modelo real, con o sin código |
| 09 | Reto final | 10 preguntas, glosario y referencias |

---

## Cómo usarlo

### Ver la página en tu computadora

```bash
npx --yes http-server . -p 8766 -c-1
```

Abre `http://localhost:8766`. Los videos necesitan un servidor que permita saltar dentro del archivo (Range), por eso conviene usar `http-server` en vez de abrir el HTML con doble clic.

### Videos (HyperFrames)

Las escenas viven en `motion/explicadores/scenes/p01` a `p07` y comparten el kit «modo maestro» de `motion/explicadores/shared` (el mismo de la guía de API REST). Para volver a renderizarlas:

```bash
cd motion/explicadores
node render-all.mjs          # las 7
node render-all.mjs p03 p05  # solo algunas
```

Deja los videos en `assets/motion/` y los pósteres en `assets/motion/posters/`. Necesita Node.js y ffmpeg. Si cambias los pasos o la duración de una escena, actualiza `EXPLICADORES` en `app.js`.

### Laboratorio

```bash
cd laboratorios/agente-personalidad
npm test                                                      # valida las fichas de personas/
node chat.mjs personas/hr-agent.json "No me alcanzó la quincena"
node chat.mjs personas/finance-agent.json                     # conversación interactiva
```

Dentro de la conversación, `/prompt` muestra el prompt de sistema y `/salir` termina. Para usar un modelo real define `ANTHROPIC_API_KEY` (Claude) u `OPENAI_API_KEY`; `IA_MODELO` cambia el modelo.

---

## Entrega del ejercicio

1. Haz *fork* y crea la rama `feat/agente-<tu-nombre>`.
2. Guarda tu `persona.json` (descargado de la estación 07) en `laboratorios/agente-personalidad/personas/<tu-nombre>.json`.
3. Corre `npm test`: valida que tu ficha esté completa.
4. Prueba tu agente con los tres mensajes de prueba (normal, presión y fuera de dominio) y documenta las respuestas en `personas/<tu-nombre>.md`.
5. Abre un *pull request* con tu reflexión.

| Criterio | Peso |
|---|---|
| Rasgos coherentes con el caso y justificados | 30 % |
| Ficha completa: dominio, tono, lenguaje, objetivo y límites | 25 % |
| Tres pruebas con un modelo real documentadas | 25 % |
| Reflexión y pull request ordenado | 20 % |

---

## Estructura

```
├── index.html, styles.css, app.js     # guía interactiva (estática, GitHub Pages)
├── assets/                            # fuentes, imagen y videos (assets/motion)
├── motion/explicadores/               # escenas HyperFrames y kit «modo maestro»
└── laboratorios/agente-personalidad/
    ├── chat.mjs                       # agente de consola
    ├── src/personalidad.mjs           # prompt, validación y modo simulado
    ├── personas/                      # hr-agent.json, finance-agent.json, plantilla.json
    └── test/                          # pruebas con node:test
```

Licencia MIT · Campuslands Guatemala.
