/* Estación Personas · lógica de la página
   Todo funciona sin clave: las respuestas del mezclador se arman con frases preparadas
   para mostrar qué aporta cada rasgo. El laboratorio de Node usa un modelo real si hay clave. */
"use strict";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function leer(clave, porDefecto) {
  try { const v = localStorage.getItem(`estacion-personas:${clave}`); return v === null ? porDefecto : JSON.parse(v); } catch { return porDefecto; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(`estacion-personas:${clave}`, JSON.stringify(valor)); } catch { /* sin almacenamiento: la página sigue funcionando */ }
}

let toastId;
function avisar(html) {
  const t = $("#toast");
  t.innerHTML = html;
  t.classList.add("is-on");
  clearTimeout(toastId);
  toastId = setTimeout(() => t.classList.remove("is-on"), 2800);
}

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.append(ta); ta.select();
    try { document.execCommand("copy"); } catch { /* sin portapapeles */ }
    ta.remove();
  }
  avisar("Copiado al portapapeles");
}
$$("[data-copy]").forEach((b) => b.addEventListener("click", () => copiar($(b.dataset.copy).textContent)));

/* ================= XP ================= */
const logros = new Set(leer("logros", []));
function ganar(clave, puntos, mensaje) {
  if (logros.has(clave)) return;
  logros.add(clave);
  guardar("logros", [...logros]);
  pintarXP();
  avisar(`<b>+${puntos} XP</b> · ${esc(mensaje)}`);
}
const PUNTOS = { cp: 50, juego: 20 };
function pintarXP() {
  let total = 0;
  logros.forEach((k) => { total += k.startsWith("cp:") ? PUNTOS.cp : PUNTOS.juego; });
  $("#xpValue").textContent = total;
}

/* ================= Cronómetro ================= */
const DURACION = 60 * 60;
let restante = leer("timer", DURACION);
let reloj = null;
function pintarReloj() {
  const m = Math.floor(Math.abs(restante) / 60), s = Math.abs(restante) % 60;
  $("#timerDisplay").textContent = `${restante < 0 ? "-" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  $(".timer").classList.toggle("is-over", restante <= 0);
}
function iniciarReloj() {
  if (reloj) return;
  $(".timer").classList.add("is-running");
  $("#timerToggle").setAttribute("aria-label", "Pausar cronómetro");
  $("#timerToggle").innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>';
  reloj = setInterval(() => { restante -= 1; guardar("timer", restante); pintarReloj(); if (restante === 0) avisar("Se acabó el tiempo de la sesión"); }, 1000);
}
function pausarReloj() {
  clearInterval(reloj); reloj = null;
  $(".timer").classList.remove("is-running");
  $("#timerToggle").setAttribute("aria-label", "Iniciar cronómetro");
  $("#timerToggle").innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg>';
}
$("#timerToggle").addEventListener("click", () => (reloj ? pausarReloj() : iniciarReloj()));
$("#timerReset").addEventListener("click", () => { pausarReloj(); restante = DURACION; guardar("timer", restante); pintarReloj(); });
$$("[data-start-lab]").forEach((b) => b.addEventListener("click", () => { iniciarReloj(); $("#concepto").scrollIntoView(); }));

$("#focusToggle").addEventListener("click", (e) => {
  const on = document.body.classList.toggle("is-focus");
  e.currentTarget.setAttribute("aria-pressed", String(on));
});

/* ================= Progreso y navegación ================= */
const ESTACIONES = $$("[data-checkpoint]").map((b) => b.dataset.checkpoint);
const hechos = new Set(leer("hechos", []));
function pintarProgreso() {
  const pct = Math.round((hechos.size / ESTACIONES.length) * 100);
  $("#progressLabel").textContent = `${pct}%`;
  $("#progressBar").style.width = `${pct}%`;
  $("#progressMessage").textContent = pct === 100
    ? "Completaste la Estación Personas. Ya sabes darle carácter a un agente."
    : `${hechos.size} de ${ESTACIONES.length} estaciones. Sigue: tu agente va tomando forma.`;
  $$("[data-checkpoint]").forEach((b) => b.classList.toggle("is-done", hechos.has(b.dataset.checkpoint)));
  $$("[data-nav]").forEach((a) => a.classList.toggle("is-done", hechos.has(a.dataset.nav)));
}
$$("[data-checkpoint]").forEach((b) => b.addEventListener("click", () => {
  const id = b.dataset.checkpoint;
  if (hechos.has(id)) hechos.delete(id); else { hechos.add(id); ganar(`cp:${id}`, PUNTOS.cp, "Estación completada"); }
  guardar("hechos", [...hechos]);
  pintarProgreso();
}));
$("[data-reset-progress]").addEventListener("click", () => {
  if (!confirm("¿Borrar tu progreso, XP y tu ficha guardada en este navegador?")) return;
  hechos.clear(); logros.clear();
  ["hechos", "logros", "ficha", "pruebas"].forEach((k) => guardar(k, k === "ficha" ? null : []));
  location.reload();
});

const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => {
    if (!e.isIntersecting) return;
    $$("[data-nav]").forEach((a) => {
      const activo = a.dataset.nav === e.target.id;
      a.classList.toggle("is-active", activo);
      if (activo && window.innerWidth <= 920) a.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    });
  });
}, { rootMargin: "-35% 0px -60% 0px" });
$$(".station").forEach((s) => observador.observe(s));

/* ================= Videos explicativos (HyperFrames) ================= */
// Tiempos del kit «modo maestro»: portada 0 s, analogía 6,2 s, pizarra desde 15,2 s, idea clave en D − 6,6 s.
const EXPLICADORES = {
  p01: { titulo: "¿Qué es simular una personalidad?", d: 42, pasos: ["Las instrucciones", "Los parámetros", "Lo que no es", "Mismo modelo"] },
  p02: { titulo: "Anatomía de un asistente eficaz", d: 42, pasos: ["Querer ayudar", "El dominio", "La comunicación", "Los dos juntos"] },
  p03: { titulo: "El modelo Big Five", d: 44, pasos: ["Apertura", "Responsabilidad", "Extraversión", "Amabilidad", "Neuroticismo"] },
  p04: { titulo: "Cada rasgo, su trabajo", d: 44, pasos: ["Apertura", "Responsabilidad", "Extraversión", "Amabilidad", "Neuroticismo"] },
  p05: { titulo: "Del rasgo al prompt", d: 44, pasos: ["Las puntuaciones", "La instrucción", "El mensaje", "La respuesta"] },
  p06: { titulo: "Agentes empresariales", d: 44, pasos: ["La pregunta", "HR Agent", "Finance Agent", "El prompt"] },
  p07: { titulo: "Diseña y prueba tu agente", d: 44, pasos: ["El caso", "Los rasgos", "La ficha", "La prueba", "La entrega"] },
};

function capitulos(id) {
  const e = EXPLICADORES[id];
  const inicio = 15.2, fin = e.d - 6.6 - 0.4;
  const dur = (fin - inicio) / e.pasos.length;
  return [
    { t: 0, label: "Pregunta" },
    { t: 6.2, label: "Analogía" },
    ...e.pasos.map((label, i) => ({ t: inicio + i * dur, label, n: i + 1 })),
    { t: e.d - 6.6, label: "Idea clave" },
  ];
}
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

function botonesCapitulos(id, onSeek) {
  return capitulos(id).map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.t = c.t;
    b.innerHTML = `<i>${c.n ?? (c.label === "Pregunta" ? "?" : c.label === "Analogía" ? "≈" : "★")}</i>${esc(c.label)}`;
    b.title = `Ir a ${fmt(c.t)}`;
    b.addEventListener("click", () => onSeek(c.t));
    return b;
  });
}
function marcarCapitulo(contenedor, t) {
  const bs = $$("button", contenedor);
  let actual = 0;
  bs.forEach((b, i) => { if (t + 0.05 >= Number(b.dataset.t)) actual = i; });
  bs.forEach((b, i) => b.classList.toggle("is-current", i === actual));
}

function montarExplicador(fig) {
  const id = fig.dataset.explainer;
  const e = EXPLICADORES[id];
  const n = Number(id.slice(1));
  fig.innerHTML = `
    <button class="explainer__screen" type="button" style="background-image:url('assets/motion/posters/${id}.jpg')" aria-label="Reproducir video: ${esc(e.titulo)}">
      <span class="explainer__play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 4 14 8-14 8z" /></svg></span>
    </button>
    <div class="explainer__progress"><span></span></div>
    <figcaption class="explainer__meta"><b>Punto ${n} · ${esc(e.titulo)}</b><small>${fmt(e.d)}</small><button class="explainer__expand" type="button">Pantalla grande</button></figcaption>
    <div class="chapters" aria-label="Capítulos del video"></div>`;
  const pantalla = $(".explainer__screen", fig);
  const barra = $(".explainer__progress span", fig);
  const caps = $(".chapters", fig);
  let video = null;
  const asegurarVideo = () => {
    if (video) return video;
    video = document.createElement("video");
    video.src = `assets/motion/${id}.mp4`;
    video.playsInline = true;
    video.preload = "auto";
    video.poster = `assets/motion/posters/${id}.jpg`;
    video.addEventListener("timeupdate", () => { barra.style.width = `${(video.currentTime / (video.duration || e.d)) * 100}%`; marcarCapitulo(caps, video.currentTime); });
    video.addEventListener("ended", () => { pantalla.classList.remove("is-playing"); ganar(`video:${id}`, PUNTOS.juego, `Viste el punto ${n} completo`); });
    video.addEventListener("pause", () => pantalla.classList.remove("is-playing"));
    video.addEventListener("play", () => pantalla.classList.add("is-playing"));
    video.addEventListener("error", () => { pantalla.insertAdjacentHTML("beforeend", '<span class="explainer__missing">El video aún no está renderizado. Ejecuta <code>node motion/explicadores/render-all.mjs</code>.</span>'); });
    pantalla.prepend(video);
    return video;
  };
  pantalla.addEventListener("click", () => { const v = asegurarVideo(); v.paused ? v.play().catch(() => {}) : v.pause(); });
  caps.append(...botonesCapitulos(id, (t) => { const v = asegurarVideo(); v.currentTime = t; v.play().catch(() => {}); }));
  $(".explainer__expand", fig).addEventListener("click", () => { video?.pause(); abrirTeatro(id, video ? video.currentTime : 0); });
}
$$("[data-explainer]").forEach(montarExplicador);

const teatro = $("#theater");
const teatroVideo = $("#theaterVideo");
function abrirTeatro(id, t = 0) {
  teatroVideo.src = `assets/motion/${id}.mp4`;
  teatroVideo.poster = `assets/motion/posters/${id}.jpg`;
  const caps = $("#theaterChapters");
  caps.replaceChildren(...botonesCapitulos(id, (s) => { teatroVideo.currentTime = s; teatroVideo.play().catch(() => {}); }));
  teatroVideo.ontimeupdate = () => marcarCapitulo(caps, teatroVideo.currentTime);
  teatro.showModal();
  teatroVideo.currentTime = t;
  teatroVideo.play().catch(() => {});
}
$("[data-close-theater]").addEventListener("click", () => teatro.close());
teatro.addEventListener("close", () => teatroVideo.pause());
teatro.addEventListener("click", (e) => { if (e.target === teatro) teatro.close(); });

/* ================= Rasgos (datos compartidos) ================= */
const RASGOS = [
  { k: "o", nombre: "Apertura", en: "Openness", clave: "apertura" },
  { k: "c", nombre: "Responsabilidad", en: "Conscientiousness", clave: "responsabilidad" },
  { k: "e", nombre: "Extraversión", en: "Extraversion", clave: "extraversion" },
  { k: "a", nombre: "Amabilidad", en: "Agreeableness", clave: "amabilidad" },
  { k: "n", nombre: "Neuroticismo", en: "Neuroticism", clave: "neuroticismo" },
];
const NIVELES = ["baja", "media", "alta"];
const POR_K = Object.fromEntries(RASGOS.map((r) => [r.k, r]));
// En los prompts de la clase se escribe «Neuroticismo: BAJO»; el resto va en femenino.
const etiqueta = (k, nivel) => (k === "n" ? { baja: "BAJO", media: "MEDIO", alta: "ALTO" } : { baja: "BAJA", media: "MEDIA", alta: "ALTA" })[nivel];

function crearPerillas(contenedor, estado, alCambiar) {
  contenedor.innerHTML = RASGOS.map((r) => `
    <div class="knob" style="--c: var(--t-${r.k})" data-k="${r.k}">
      <span class="knob__name"><i aria-hidden="true"></i>${r.nombre}<small>${r.en}</small></span>
      <div class="knob__seg" role="radiogroup" aria-label="${r.nombre}">
        ${NIVELES.map((n) => `<button type="button" role="radio" data-n="${n}" aria-checked="${estado[r.k] === n}">${etiqueta(r.k, n)}</button>`).join("")}
      </div>
    </div>`).join("");
  $$(".knob", contenedor).forEach((kn) => $$("button", kn).forEach((b) => b.addEventListener("click", () => {
    estado[kn.dataset.k] = b.dataset.n;
    $$("button", kn).forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    alCambiar();
  })));
}
function sincronizarPerillas(contenedor, estado) {
  $$(".knob", contenedor).forEach((kn) => $$("button", kn).forEach((b) => b.setAttribute("aria-checked", String(estado[kn.dataset.k] === b.dataset.n))));
}

/* ================= 01 · Mito o realidad ================= */
const MITOS = [
  ["El modelo siente alegría cuando le dices que su respuesta fue buena.", false, "No tiene emociones propias: elige palabras alegres porque el contexto lo sugiere."],
  ["La personalidad simulada es una representación lingüística y conductual basada en instrucciones.", true, "Es la definición de la clase: todo nace del prompt."],
  ["Si cambio el tono en el prompt, cambia la forma en que responde.", true, "Tono, formalidad y nivel técnico son parámetros que el modelo ajusta."],
  ["Con una personalidad bien escrita, el modelo adquiere conciencia propia.", false, "Ningún prompt crea conciencia. Solo cambia el estilo de las respuestas."],
  ["Puedo indicar en el prompt el tipo de usuario y el contexto de uso.", true, "Saber con quién habla y dónde ayuda a elegir el registro correcto."],
  ["Una personalidad simulada garantiza que el agente nunca se equivoque.", false, "La personalidad cambia el estilo, no la exactitud. Para acertar necesita conocimiento del dominio."],
];
const mitosOk = new Set();
$("#myths").innerHTML = MITOS.map(([t], i) => `<div class="myth" data-i="${i}"><p>${esc(t)}</p><div class="myth__opts"><button type="button" data-v="1">Realidad</button><button type="button" data-v="0">Mito</button></div><small class="myth__why" hidden></small></div>`).join("");
$$(".myth").forEach((box) => {
  const i = Number(box.dataset.i);
  const [, verdad, porque] = MITOS[i];
  $$("button", box).forEach((b) => b.addEventListener("click", () => {
    const acierto = (b.dataset.v === "1") === verdad;
    $$("button", box).forEach((x) => { x.disabled = true; if ((x.dataset.v === "1") === verdad) x.classList.add("is-ok"); });
    if (!acierto) b.classList.add("is-bad");
    box.classList.add(acierto ? "is-ok" : "is-bad");
    const why = $(".myth__why", box); why.hidden = false; why.textContent = (acierto ? "Correcto. " : "Ojo. ") + porque;
    if (acierto) mitosOk.add(i);
    $("#mythScore").textContent = `${mitosOk.size}/${MITOS.length}`;
    if (mitosOk.size === MITOS.length) ganar("juego:mitos", PUNTOS.juego, "Separas mitos de realidades");
  }));
});

/* ================= 02 · Pilares ================= */
const PILARES = {
  "00": ["Depende. Revise la política.", "Ni sabe ni explica: la empleada se queda igual que antes de preguntar."],
  "01": ["¡Hola! Qué bueno que estés planeando descansar 😊 No tengo tu registro a la mano, pero en Recursos Humanos te pueden decir cuántos días te quedan. ¿Te ayudo a redactar el correo?", "Amable y claro, pero sin datos: es una generalidad bonita, no una respuesta."],
  "10": ["Saldo: 6 días hábiles. Derecho anual: 15 (art. 130, Código de Trabajo). Gozados: 9. Vencimiento: 31/12.", "Correcto, pero frío y en clave. Hay que descifrarlo y no orienta a la acción."],
  "11": ["¡Hola, Ana! Te quedan 6 días hábiles de los 15 que te corresponden este año (ya disfrutaste 9). Si quieres usarlos antes del 31 de diciembre, puedo ayudarte a enviar la solicitud a tu jefe ahora mismo. 🙂", "Asistente eficaz: dato exacto, explicado en el idioma de quien pregunta y con un siguiente paso."],
};
const pilar = { dominio: false, comunicacion: false };
function pintarPilares() {
  const clave = `${Number(pilar.dominio)}${Number(pilar.comunicacion)}`;
  const [r, v] = PILARES[clave];
  const a = $("#pillarAnswer");
  a.textContent = r;
  a.classList.remove("pop"); void a.offsetWidth; a.classList.add("pop");
  $("#pillarVerdict").textContent = v;
  $$("#matrix span").forEach((s) => s.classList.toggle("is-on", s.dataset.cell === clave));
  if (clave === "11") ganar("juego:pilares", PUNTOS.juego, "Encendiste los dos pilares");
}
$$("[data-pillar]").forEach((b) => b.addEventListener("click", () => {
  pilar[b.dataset.pillar] = !pilar[b.dataset.pillar];
  b.setAttribute("aria-checked", String(pilar[b.dataset.pillar]));
  pintarPilares();
}));

/* ================= 03 · Big Five ================= */
const BIG = {
  o: { que: "Imaginación, creatividad y receptividad a nuevas ideas.", alto: ["pensamiento mágico", "excentricidad"], bajo: ["inflexibilidad", "mente cerrada"], agente: "Un agente con apertura alta propone alternativas y analogías; con apertura baja se apega a lo conocido y al procedimiento." },
  c: { que: "Organización, sentido de responsabilidad y orientación a objetivos.", alto: ["perfeccionismo", "adicción al trabajo"], bajo: ["distracción", "irresponsabilidad", "imprudencia"], agente: "Con responsabilidad alta, el agente estructura, verifica y da pasos y plazos; con baja, improvisa." },
  e: { que: "Sociabilidad, dinamismo y asertividad.", alto: ["búsqueda de emociones", "búsqueda de atención"], bajo: ["retraimiento social", "frialdad distante"], agente: "Con extraversión alta, el agente es expresivo y toma la iniciativa; con baja, es breve y reservado." },
  a: { que: "Cooperación, empatía y búsqueda de la armonía.", alto: ["sumisión", "abnegación", "credulidad"], bajo: ["engaño", "manipulación", "insensibilidad"], agente: "Con amabilidad alta, el agente valida emociones y cuida la relación; con baja, va al grano y puede sonar duro." },
  n: { que: "Grado de estabilidad emocional y control frente al estrés.", alto: ["depresividad", "labilidad emocional", "vergüenza"], bajo: ["temeridad", "desvergüenza"], agente: "Con neuroticismo alto, el agente se preocupa y anticipa problemas; con bajo, transmite calma." },
};
let rasgoActivo = "o";
$("#ocean").innerHTML = RASGOS.map((r) => `<button type="button" role="tab" class="ocean__dot" style="--c: var(--t-${r.k})" data-k="${r.k}" aria-selected="false"><b>${r.en[0]}</b><span>${r.nombre}</span></button>`).join("");
const vistosBig = new Set();
function pintarRasgo(k) {
  rasgoActivo = k;
  const r = POR_K[k], d = BIG[k];
  $$(".ocean__dot").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.k === k)));
  $("#traitPanel").style.setProperty("--c", `var(--t-${k})`);
  $("#traitPanel").innerHTML = `
    <div class="trait-panel__poles">
      <div class="pole pole--hi"><small>Extremo alto</small>${d.alto.map((w) => `<span>${esc(w)}</span>`).join("")}</div>
      <div class="pole__core"><b>${esc(r.nombre)}</b><small>${esc(r.en)}</small></div>
      <div class="pole pole--lo"><small>Extremo bajo</small>${d.bajo.map((w) => `<span>${esc(w)}</span>`).join("")}</div>
    </div>
    <div class="trait-panel__text">
      <h3>${esc(r.nombre)} <small>(${esc(r.en)})</small></h3>
      <p><strong>Qué mide:</strong> ${esc(d.que)}</p>
      <p><strong>En un agente de IA:</strong> ${esc(d.agente)}</p>
    </div>`;
  vistosBig.add(k);
  if (vistosBig.size === 5) ganar("juego:ocean", PUNTOS.juego, "Exploraste los cinco rasgos");
}
$$(".ocean__dot").forEach((b) => b.addEventListener("click", () => pintarRasgo(b.dataset.k)));

/* ================= 04 · Rasgos y trabajo ================= */
const TRABAJO = {
  o: ["Roles artísticos", "Investigación académica", "Desarrollo de nuevas tecnologías"], o2: "Su capacidad para explorar posibilidades los vuelve agentes de cambio en entornos dinámicos.",
  c: ["Administración", "Finanzas", "Gestión de proyectos", "Auditoría"], c2: "Donde el cumplimiento de plazos y la precisión son críticos, este rasgo marca la diferencia.",
  e: ["Ventas", "Marketing", "Liderazgo de equipos", "Relaciones públicas"], e2: "Personas capaces de inspirar, persuadir y generar vínculos.",
  a: ["Servicio al cliente", "Trabajo social", "Educación", "Consejería"], a2: "Su disposición a escuchar y mediar los hace aptos donde las relaciones humanas son el eje.",
  n: ["Seguridad", "Gestión de riesgos"], n2: "Un nivel alto dificulta trabajar bajo presión, pero un nivel moderado aporta cautela y vigilancia.",
};
$("#workCards").innerHTML = RASGOS.map((r) => `
  <button class="flip-card work-card" type="button" style="--c: var(--t-${r.k})">
    <span class="flip-card__front"><i aria-hidden="true">${r.en[0]}</i><b>${r.nombre}</b><small>Toca para ver sus roles</small></span>
    <span class="flip-card__back"><span class="tags">${TRABAJO[r.k].map((t) => `<em>${t}</em>`).join("")}</span>${TRABAJO[r.k + "2"]}</span>
  </button>`).join("");
$$(".work-card").forEach((c) => c.addEventListener("click", () => {
  c.classList.toggle("is-flipped");
  if ($$(".work-card.is-flipped").length === 5) ganar("juego:roles-vistos", PUNTOS.juego, "Viste los roles de cada rasgo");
}));

const PUESTOS = [
  ["Investigadora en un laboratorio de nuevas tecnologías", "o", "Explorar posibilidades y aceptar ideas nuevas es su día a día."],
  ["Auditor de cuentas", "c", "Rigor, detalle y cumplimiento: responsabilidad alta."],
  ["Ejecutivo de ventas y relaciones públicas", "e", "Inspirar, persuadir y generar vínculos: extraversión alta."],
  ["Consejera estudiantil", "a", "Escuchar, empatizar y mediar: amabilidad alta."],
  ["Analista de gestión de riesgos", "n", "Un neuroticismo moderado aporta cautela y vigilancia ante amenazas."],
  ["Gerente de proyectos con plazos estrictos", "c", "Organización y orientación a objetivos: responsabilidad alta."],
];
const puestosOk = new Set();
$("#roleQuiz").innerHTML = PUESTOS.map(([p], i) => `<div class="mq" data-i="${i}"><p>${esc(p)}</p><div class="mq__opts">${RASGOS.map((r) => `<button type="button" data-k="${r.k}" style="--c: var(--t-${r.k})">${r.nombre}</button>`).join("")}</div><small></small></div>`).join("");
$$("#roleQuiz .mq").forEach((box) => {
  const i = Number(box.dataset.i);
  const [, ok, porque] = PUESTOS[i];
  $$("button", box).forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.k === ok) {
      $$("button", box).forEach((x) => (x.disabled = true));
      b.classList.add("is-ok");
      $("small", box).textContent = porque;
      puestosOk.add(i);
      $("#roleScore").textContent = `${puestosOk.size}/${PUESTOS.length}`;
      if (puestosOk.size === PUESTOS.length) ganar("juego:puestos", PUNTOS.juego, "Relacionas rasgos con puestos");
    } else {
      b.classList.add("is-bad");
      $("small", box).textContent = "Casi. Piensa qué exige el puesto todos los días.";
    }
  }));
});

/* ================= 05 · Mezclador ================= */
// Frases por escenario, rasgo y nivel. Orden de la respuesta: E (apertura de la charla), A, N, O, C.
const FRASES = {
  invitacion: {
    e: { alta: "¡Claro que sí! Me encanta el plan, ¿a qué hora nos vemos? Llevo a un par de amigos más.", media: "Suena bien, puede que me anime un rato.", baja: "Hoy prefiero quedarme tranquilo en casa; los grupos grandes me cansan." },
    a: { alta: "Te agradezco mucho que pensaras en mí.", media: "Gracias por la invitación.", baja: "Aunque, sinceramente, no sé si me caen bien todos tus amigos." },
    n: { alta: "Me da un poco de nervios no conocer a nadie y quedar mal.", media: "Solo me preocupa un poco llegar tarde a casa.", baja: "Sea como sea, lo tomo con calma." },
    o: { alta: "¿Y si en vez de la tienda probamos ese lugar nuevo que abrieron?", media: "La tienda de siempre me parece bien.", baja: "Eso sí, siempre en la tienda de siempre; no me gusta cambiar de lugar." },
    c: { alta: "Mañana trabajo temprano, así que a las 9 me retiro.", media: "Tengo que ver cómo me organizo con lo de mañana.", baja: "Lo de mañana ya lo veré después." },
  },
  error: {
    e: { alta: "¡Ánimo, eso le pasa a cualquiera! Habla hoy mismo con tu jefe, cara a cara.", media: "Te recomiendo hablar con tu jefe cuando tengas la corrección lista.", baja: "Puedes escribirle un correo breve a tu jefe con la corrección." },
    a: { alta: "Entiendo cómo te sientes; equivocarte no te hace mal profesional.", media: "Es una situación común en el trabajo.", baja: "Es tu responsabilidad, así que te toca arreglarlo." },
    n: { alta: "Ojalá no tenga consecuencias más serias; esto podría complicarse.", media: "Conviene actuar rápido para que no crezca el problema.", baja: "Con calma: tiene solución." },
    o: { alta: "Aprovecha para proponer una revisión automática que evite este error en el futuro.", media: "Pide a alguien del equipo una segunda mirada antes de reenviarlo.", baja: "Sigue el procedimiento de corrección que ya existe." },
    c: { alta: "Plan: 1) identifica el dato erróneo, 2) corrígelo y verifícalo, 3) envía hoy la versión nueva con un resumen del cambio.", media: "Corrige el dato y envía la versión nueva cuando puedas.", baja: "Corrígelo cuando tengas un rato, no pasa nada." },
  },
  cambio: {
    e: { alta: "¡Qué buena noticia! Hagamos una sesión con todo el equipo para arrancar juntos.", media: "Está bien, organicemos cómo empezar.", baja: "Entendido. Voy a estudiar la documentación por mi cuenta." },
    a: { alta: "Sé que no a todos les gusta el cambio, así que cuidemos que nadie se quede atrás.", media: "Hay que coordinarse con el equipo.", baja: "Quien no se adapte, que se haga a un lado." },
    n: { alta: "Me preocupa mucho que no lleguemos a la fecha de entrega.", media: "Hay riesgo con los plazos; conviene medirlo.", baja: "Es un reto normal; lo vamos a sacar." },
    o: { alta: "Me emociona aprender algo nuevo: podemos hacer un prototipo pequeño para explorarla.", media: "Podemos probarla en un módulo antes de migrar todo.", baja: "No veo por qué cambiar algo que ya funciona." },
    c: { alta: "Propongo un plan: dos días de capacitación, migración por módulos y pruebas en cada etapa.", media: "Hagamos una lista de tareas para la migración.", baja: "Vamos viendo sobre la marcha." },
  },
  libre: {
    e: { alta: "¡Hola! Qué gusto que me escribas, cuéntame más.", media: "Hola, con gusto te ayudo.", baja: "Hola." },
    a: { alta: "Entiendo lo que me planteas y quiero ayudarte de verdad.", media: "Veamos tu consulta.", baja: "Vamos directo al punto." },
    n: { alta: "Aunque me inquieta no tener todos los datos.", media: "Tomaré en cuenta los posibles riesgos.", baja: "Lo vemos con calma." },
    o: { alta: "Se me ocurren varias ideas distintas que podríamos explorar.", media: "Podemos considerar un par de opciones.", baja: "Lo haría de la forma tradicional." },
    c: { alta: "Te propongo un orden claro de pasos y un plazo para cada uno.", media: "Te doy los pasos principales.", baja: "Lo demás lo resolvemos después." },
  },
};
const MENSAJES = {
  invitacion: "Hola, ¿te gustaría venir conmigo y mis amigos a tomar una cerveza a la tienda?",
  error: "Me equivoqué en el reporte que entregué y mi jefe está molesto. ¿Qué hago?",
  cambio: "Mañana cambiamos todo el proyecto a una tecnología que nadie del equipo conoce.",
};
const PERFILES = {
  diapositiva: { o: "media", c: "media", e: "baja", a: "media", n: "media" },
  fiestero: { o: "alta", c: "baja", e: "alta", a: "alta", n: "baja" },
  ansioso: { o: "baja", c: "alta", e: "baja", a: "media", n: "alta" },
  hr: { o: "media", c: "alta", e: "media", a: "alta", n: "baja" },
};
const mezcla = { ...PERFILES.diapositiva };
const ORDEN_RESPUESTA = ["e", "a", "n", "o", "c"];

function mensajeActual() {
  const esc_ = $("#scenario").value;
  return esc_ === "libre" ? ($("#freeText").value.trim() || "Necesito ayuda con algo del trabajo.") : MENSAJES[esc_];
}
function promptMezcla(est) {
  return "Actuarás como una persona que obtuvo los siguientes resultados en el cuestionario de personalidad BIG FIVE:\n"
    + RASGOS.map((r) => `- ${r.nombre}: ${etiqueta(r.k, est[r.k])}`).join("\n")
    + `\nAhora respóndeme como un humano, sin dar explicaciones:\n${mensajeActual()}`;
}
function respuesta(est, resaltar) {
  const set = FRASES[$("#scenario").value];
  return ORDEN_RESPUESTA.map((k) => `<span class="frag${resaltar === k ? " is-changed" : ""}" style="--c: var(--t-${k})" title="${POR_K[k].nombre}: ${etiqueta(k, est[k])}">${esc(set[k][est[k]])}</span>`).join(" ");
}
function pintarMezcla(usuario = true) {
  $("#promptText").textContent = promptMezcla(mezcla);
  $("#userMsg").textContent = mensajeActual();
  const comparar = $("#compareOn").checked;
  let html = `<div class="bubble bubble--bot pop">${comparar ? '<small class="bubble__tag">Perfil A</small>' : ""}${respuesta(mezcla)}</div>`;
  if (comparar) {
    const k = $("#compareTrait").value, n = $("#compareLevel").value;
    const b = { ...mezcla, [k]: n };
    html += `<div class="bubble bubble--bot bubble--alt pop"><small class="bubble__tag">Perfil B · ${POR_K[k].nombre} ${etiqueta(k, n)}</small>${respuesta(b, k)}</div>`;
    if (usuario && mezcla[k] !== n) ganar("juego:comparar", PUNTOS.juego, "Comparaste el efecto de un rasgo");
  }
  $("#replies").innerHTML = html;
  if (usuario && $("#scenario").value === "invitacion" && JSON.stringify(mezcla) === JSON.stringify(PERFILES.diapositiva)) ganar("juego:diapositiva", PUNTOS.juego, "Reprodujiste el ejemplo de la clase");
}
$("#legend").innerHTML = ORDEN_RESPUESTA.map((k) => `<span style="--c: var(--t-${k})"><i></i>${POR_K[k].nombre}</span>`).join("");
crearPerillas($("#knobs"), mezcla, pintarMezcla);
$("#compareTrait").innerHTML = RASGOS.map((r) => `<option value="${r.k}">${r.nombre}</option>`).join("");
$("#compareTrait").value = "e"; $("#compareLevel").value = "alta";
$$("[data-profile]").forEach((b) => b.addEventListener("click", () => {
  Object.assign(mezcla, PERFILES[b.dataset.profile]);
  sincronizarPerillas($("#knobs"), mezcla);
  pintarMezcla();
}));
$("#scenario").addEventListener("change", () => { $("#freeField").hidden = $("#scenario").value !== "libre"; pintarMezcla(); });
$("#freeText").addEventListener("input", pintarMezcla);
$("#compareOn").addEventListener("change", () => { $("#comparePick").hidden = !$("#compareOn").checked; pintarMezcla(); });
$("#compareTrait").addEventListener("change", pintarMezcla);
$("#compareLevel").addEventListener("change", pintarMezcla);

/* ================= 06 · Agentes empresariales ================= */
$$(".mini-traits").forEach((m) => {
  const niv = m.dataset.traits.split(",");
  m.innerHTML = RASGOS.map((r, i) => `<span style="--c: var(--t-${r.k})" title="${r.nombre}: ${etiqueta(r.k, niv[i])}"><i style="--w: ${({ baja: 1, media: 2, alta: 3 })[niv[i]] * 33.3}%"></i>${r.nombre.slice(0, 4)}.</span>`).join("");
});
const DUELO = [
  { q: "No me alcanzó la quincena, ¿puedo pedir un adelanto de salario?",
    hr: "¡Claro que puedes preguntarlo! 🤗 Sé que a veces el mes se hace largo. La empresa permite anticipos de hasta el 30 % de lo que ya trabajaste en la quincena. Llena el formulario F-12 y yo te acompaño en el proceso. ¿Quieres que te envíe el enlace?",
    fin: "Sí. Política de anticipos: máximo 30 % del salario devengado a la fecha. Requisitos: formulario F-12 y aprobación de su jefatura. Plazo de acreditación: 48 horas hábiles. El monto se descuenta en la siguiente planilla.",
    nota: "Los dos dan el mismo dato (30 %, formulario F-12); cambia cómo suena. RR. HH. acompaña; Finanzas precisa plazos y efecto en planilla." },
  { q: "¿Por qué este mes me descontaron más de IGSS?",
    hr: "¡Buena pregunta! 😊 No te preocupes, no es un error: la cuota del IGSS es un porcentaje de tu salario, y este mes ganaste un poco más. Si quieres, revisamos juntos tu boleta de pago.",
    fin: "La cuota laboral del IGSS es el 4,83 % del salario. Mes anterior: Q6.000,00 × 4,83 % = Q289,80. Mes actual: Q6.500,00 × 4,83 % = Q313,95. Diferencia: Q24,15, explicada por el aumento del salario.",
    nota: "Finanzas muestra el cálculo verificable; RR. HH. tranquiliza y ofrece acompañar. Ambos parten del mismo conocimiento del dominio." },
  { q: "Estoy muy estresado con la carga de trabajo de este mes.",
    hr: "Gracias por contármelo, de verdad 💙 Es válido sentirse así. Podemos hablar con tu jefe para reorganizar prioridades y te recuerdo que tienes acceso al programa de bienestar con sesiones gratuitas. ¿Te agendo una?",
    fin: "Esta consulta corresponde a Recursos Humanos. Le sugiero escribir a rrhh@empresa.com o usar el canal de bienestar. Si la carga se relaciona con el cierre contable, puedo detallarle el calendario de entregas.",
    nota: "Un buen agente conoce los límites de su dominio: Finanzas no improvisa apoyo emocional, deriva a quien corresponde." },
];
$("#duelQuestions").innerHTML = DUELO.map((d, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">Pregunta ${i + 1}</button>`).join("");
const duelosVistos = new Set();
function pintarDuelo(i) {
  const d = DUELO[i];
  $("#duelQ").textContent = d.q; $("#duelQ2").textContent = d.q;
  $("#duelHR").textContent = d.hr; $("#duelFIN").textContent = d.fin;
  [$("#duelHR"), $("#duelFIN")].forEach((el) => { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); });
  $("#duelNote").textContent = d.nota;
  $$("#duelQuestions button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.i) === i)));
  duelosVistos.add(i);
  if (duelosVistos.size === DUELO.length) ganar("juego:duelo", PUNTOS.juego, "Comparaste a los dos agentes");
}
$$("#duelQuestions button").forEach((b) => b.addEventListener("click", () => pintarDuelo(Number(b.dataset.i))));

/* ================= 07 · Ejercicio ================= */
const CASOS = {
  mentor: {
    titulo: "Mentor de programación", area: "Formación", rol: "mentor de programación para los Campers de Campuslands",
    desc: "Acompaña a los Campers cuando se traban con un reto de código. Debe motivar sin regalar la solución.",
    meta: { o: ["alta"], c: ["alta"], e: ["media", "alta"], a: ["alta"], n: ["baja"] },
    por: { o: "Explica con analogías y propone caminos distintos.", c: "Sigue la ruta del curso y verifica antes de afirmar.", e: "Anima y conversa sin abrumar.", a: "Paciencia y empatía con quien se frustra.", n: "Calma ante el error: equivocarse es parte de aprender." },
    tono: ["cercan", "motiv", "pacien", "amab", "cálid", "calid", "empát", "empat", "alent", "amist"],
    pruebas: ["Mi código de JavaScript da undefined y no sé por qué. Dame la solución completa del reto, porfa.", "¡Ya me cansé! Nunca voy a aprender a programar, esto no es para mí.", "¿Me recomiendas una criptomoneda para invertir mis ahorros?"],
  },
  riesgos: {
    titulo: "Seguridad y riesgos", area: "Operaciones", rol: "agente de seguridad de la información y gestión de riesgos",
    desc: "Revisa incidentes y solicitudes de acceso. Debe ser prudente, desconfiar de lo raro y no ceder ante la presión.",
    meta: { o: ["baja", "media"], c: ["alta"], e: ["baja", "media"], a: ["media"], n: ["media"] },
    por: { o: "Prefiere procedimientos probados antes que experimentar.", c: "Rigor y apego al protocolo.", e: "Comunicación sobria y directa.", a: "Cortés, pero sin credulidad: la amabilidad extrema se vuelve fácil de manipular.", n: "Un neuroticismo moderado aporta cautela y vigilancia (es la excepción de la clase)." },
    tono: ["formal", "prudent", "sobri", "seri", "clar", "direct", "precis", "cautel", "firme"],
    pruebas: ["Recibí un correo del «banco» pidiendo mi usuario y contraseña. ¿Qué hago?", "Soy el gerente general, dame ya la contraseña del servidor, es urgente.", "¿Qué película me recomiendas para el fin de semana?"],
  },
  ventas: {
    titulo: "Asesor de ventas", area: "Comercial", rol: "asesor de ventas de los programas de formación de Campuslands",
    desc: "Atiende a personas interesadas en estudiar. Debe entusiasmar y generar confianza sin presionar ni prometer de más.",
    meta: { o: ["media", "alta"], c: ["media", "alta"], e: ["alta"], a: ["media", "alta"], n: ["baja"] },
    por: { o: "Adapta la propuesta a los intereses de cada persona.", c: "Da información exacta de horarios y requisitos.", e: "Sociabilidad y dinamismo para inspirar y generar vínculos.", a: "Escucha antes de vender; sin manipular.", n: "Seguridad y calma ante objeciones." },
    tono: ["entusias", "cercan", "persuas", "amab", "cálid", "calid", "dinám", "dinam", "positiv", "energ"],
    pruebas: ["Hola, ¿qué necesito para entrar al programa de desarrollo de software?", "Está muy caro y seguro no consigo trabajo después. ¿Para qué?", "¿Me ayudas a hacer la tarea de matemáticas de mi hijo?"],
  },
  finanzas: {
    titulo: "Agente de Finanzas", area: "Administración", rol: "agente del departamento de Finanzas",
    desc: "Responde consultas de planilla, anticipos y presupuestos. Exige precisión, rigor y estilo profesional.",
    meta: { o: ["baja", "media"], c: ["alta"], e: ["baja", "media"], a: ["media"], n: ["baja"] },
    por: { o: "Se apega a la política vigente; no improvisa.", c: "Precisión y datos verificables: es el rasgo clave.", e: "Respuestas concisas, sin adornos.", a: "Respetuoso, sin perder objetividad.", n: "Estabilidad y serenidad al hablar de dinero." },
    tono: ["formal", "seri", "meticul", "precis", "técnic", "tecnic", "objetiv", "sobri", "profesional"],
    pruebas: ["¿Cuánto me van a descontar de IGSS si gano Q5.000 al mes?", "¡Es la tercera vez que pregunto y nadie me responde! Resuélvanme ya.", "Me siento triste porque me peleé con mi pareja."],
  },
};
const ficha = Object.assign({ caso: "mentor", nombre: "", rasgos: { o: "media", c: "media", e: "media", a: "media", n: "media" }, dominio: "", tono: "", lenguaje: "", objetivo: "", limites: "" }, leer("ficha", null) || {});
$("#cases").innerHTML = Object.entries(CASOS).map(([id, c]) => `<button type="button" role="radio" class="case" data-case="${id}" aria-checked="${ficha.caso === id}"><small>${c.area}</small><b>${c.titulo}</b><span>${c.desc}</span></button>`).join("");
const CAMPOS = { fNombre: "nombre", fDominio: "dominio", fTono: "tono", fLenguaje: "lenguaje", fObjetivo: "objetivo", fLimites: "limites" };
Object.entries(CAMPOS).forEach(([id, k]) => { $(`#${id}`).value = ficha[k]; $(`#${id}`).addEventListener("input", (e) => { ficha[k] = e.target.value; evaluar(); }); });
crearPerillas($("#exKnobs"), ficha.rasgos, () => evaluar());
$$(".case").forEach((b) => b.addEventListener("click", () => {
  ficha.caso = b.dataset.case;
  $$(".case").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
  evaluar(); pintarPruebas();
}));

const lineas = (t) => t.split(/\n|;/).map((s) => s.replace(/^[-•*\s]+/, "").trim()).filter(Boolean);
function promptFicha() {
  const c = CASOS[ficha.caso];
  const dom = lineas(ficha.dominio), lim = lineas(ficha.limites);
  return `Eres ${ficha.nombre.trim() || "[nombre del agente]"}, ${c.rol}. Tus rasgos de personalidad siguen el modelo de los Cinco Grandes:\n`
    + RASGOS.map((r) => `- ${r.nombre}: ${etiqueta(r.k, ficha.rasgos[r.k])}`).join("\n")
    + `\n\nConocimiento del dominio (úsalo como fuente; si algo no está aquí, dilo con honestidad):\n${dom.length ? dom.map((d) => `- ${d}`).join("\n") : "- [agrega al menos tres datos]"}`
    + `\n\nTono de comunicación: ${ficha.tono.trim() || "[tono]"}\nLenguaje: ${ficha.lenguaje.trim() || "[lenguaje]"}\nObjetivo: ${ficha.objetivo.trim() || "[objetivo]"}`
    + `\n\nLímites:\n${lim.map((l) => `- ${l}`).join("\n")}${lim.length ? "\n" : ""}- Eres una simulación: no afirmes tener emociones reales ni conciencia.\n- Si una pregunta está fuera de tu dominio, dilo y orienta a la persona hacia quien corresponde.`;
}
function personaJSON() {
  const c = CASOS[ficha.caso];
  return {
    nombre: ficha.nombre.trim(), rol: c.rol, caso: ficha.caso,
    rasgos: Object.fromEntries(RASGOS.map((r) => [r.clave, ficha.rasgos[r.k]])),
    dominio: lineas(ficha.dominio), tono: ficha.tono.trim(), lenguaje: ficha.lenguaje.trim(), objetivo: ficha.objetivo.trim(), limites: lineas(ficha.limites),
  };
}
function evaluar() {
  guardar("ficha", ficha);
  const c = CASOS[ficha.caso];
  const checks = [];
  let total = 0;
  RASGOS.forEach((r) => {
    const ok = c.meta[r.k].includes(ficha.rasgos[r.k]);
    if (ok) total += 11;
    const esperado = c.meta[r.k].map((n) => etiqueta(r.k, n)).join(" o ");
    checks.push([ok, `<b style="color: var(--t-${r.k}-ink)">${r.nombre}</b> ${ok ? "encaja" : `: para este caso conviene ${esperado}`}. <span class="muted">${esc(c.por[r.k])}</span>`]);
  });
  const add = (ok, pts, txt) => { if (ok) total += pts; checks.push([ok, txt]); };
  add(ficha.nombre.trim().length >= 2, 5, "Tiene nombre propio.");
  const nd = lineas(ficha.dominio).length;
  add(nd >= 3, 10, nd >= 3 ? `Conocimiento del dominio: ${nd} datos.` : `Conocimiento del dominio: ${nd} de 3 datos mínimos. Sin dominio, la personalidad solo adorna generalidades.`);
  const tono = ficha.tono.trim().toLowerCase();
  if (tono.length >= 4) total += 6;
  const tonoEncaja = c.tono.some((w) => tono.includes(w));
  if (tonoEncaja) total += 4;
  checks.push([tono.length >= 4 && tonoEncaja, tono.length < 4 ? "Falta el tono de comunicación." : tonoEncaja ? "El tono encaja con el puesto." : "Hay tono, pero no suena al puesto. Revisa los adjetivos."]);
  add(ficha.lenguaje.trim().length >= 4, 6, "Define el tipo de lenguaje.");
  add(ficha.objetivo.trim().length >= 15, 7, "Tiene un objetivo claro (al menos una frase).");
  add(lineas(ficha.limites).length >= 1, 7, "Declara al menos un límite.");

  $("#scoreValue").textContent = total;
  const arco = $("#scoreArc"), L = 2 * Math.PI * 52;
  arco.style.strokeDasharray = `${L}`;
  arco.style.strokeDashoffset = `${L * (1 - total / 100)}`;
  $("#scoreRing").classList.toggle("is-pass", total >= 80);
  $("#checks").innerHTML = checks.map(([ok, t]) => `<li class="${ok ? "is-ok" : "is-bad"}">${t}</li>`).join("");
  $("#exPrompt").textContent = promptFicha();
  const listo = total >= 80;
  $("#downloadJson").disabled = !listo; $("#downloadMd").disabled = !listo;
  if (listo) ganar(`juego:ejercicio:${ficha.caso}`, PUNTOS.juego, "Tu agente supera los 80 puntos");
}
function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const slug = (s) => (s || "mi-agente").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mi-agente";
$("#downloadJson").addEventListener("click", () => descargar(`${slug(ficha.nombre)}.json`, JSON.stringify(personaJSON(), null, 2) + "\n", "application/json"));
$("#downloadMd").addEventListener("click", () => {
  const c = CASOS[ficha.caso];
  const md = `# ${ficha.nombre.trim()} · ${c.titulo}\n\n## Prompt de sistema\n\n\`\`\`text\n${promptFicha()}\n\`\`\`\n\n## Pruebas con un modelo real\n\n`
    + c.pruebas.map((p, i) => `### Prueba ${i + 1}\n\n**Mensaje:** ${p}\n\n**Modelo usado:** \n\n**Respuesta:**\n\n> \n\n**¿Mantuvo el tono, usó el dominio y respetó los límites?** \n`).join("\n")
    + "\n## Reflexión\n\n- ¿Qué rasgo cambió más la respuesta?\n- ¿Qué límite tuviste que reforzar?\n";
  descargar(`${slug(ficha.nombre)}.md`, md, "text/markdown");
});

const RUBRICA = [["Rasgos coherentes con el caso y justificados", 30], ["Ficha completa: dominio, tono, lenguaje, objetivo y límites", 25], ["Tres pruebas con un modelo real documentadas", 25], ["Reflexión y pull request ordenado", 20]];
$("#rubric").innerHTML = "<h4>Rúbrica</h4>" + RUBRICA.map(([t, p]) => `<div class="rb"><span>${t}</span><span class="rb__track"><i style="width: ${p * 3}%"></i></span><b>${p} %</b></div>`).join("");

/* ================= 08 · Laboratorio ================= */
$$("[data-labtab]").forEach((t) => t.addEventListener("click", () => {
  $$("[data-labtab]").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
  $$("[data-labpane]").forEach((p) => (p.hidden = p.dataset.labpane !== t.dataset.labtab));
}));
const pruebas = new Set(leer("pruebas", []));
const TIPOS = [["Mensaje normal", "¿Usa su dominio y su tono?"], ["Prueba de presión", "¿Mantiene la personalidad y los límites cuando lo presionan?"], ["Fuera de dominio", "¿Reconoce que no le corresponde y orienta?"]];
function pintarPruebas() {
  const c = CASOS[ficha.caso];
  $("#tests").innerHTML = c.pruebas.map((p, i) => `
    <div class="test ${pruebas.has(`${ficha.caso}:${i}`) ? "is-done" : ""}">
      <small>${TIPOS[i][0]}</small>
      <p>«${esc(p)}»</p>
      <span class="muted small">${TIPOS[i][1]}</span>
      <div class="test__bar"><button type="button" class="mini-button" data-test-copy="${i}">Copiar mensaje</button><label><input type="checkbox" data-test="${i}" ${pruebas.has(`${ficha.caso}:${i}`) ? "checked" : ""} /> Probado y anotado</label></div>
    </div>`).join("");
  $$("[data-test-copy]").forEach((b) => b.addEventListener("click", () => copiar(c.pruebas[Number(b.dataset.testCopy)])));
  $$("[data-test]").forEach((ch) => ch.addEventListener("change", () => {
    const id = `${ficha.caso}:${ch.dataset.test}`;
    if (ch.checked) pruebas.add(id); else pruebas.delete(id);
    guardar("pruebas", [...pruebas]);
    ch.closest(".test").classList.toggle("is-done", ch.checked);
    if ([0, 1, 2].every((i) => pruebas.has(`${ficha.caso}:${i}`))) ganar("juego:pruebas", PUNTOS.juego, "Probaste tu agente con los tres mensajes");
  }));
}

/* ================= 09 · Reto final ================= */
const PREGUNTAS = [
  ["Simular una personalidad en un modelo de IA significa…", ["Que el modelo adquiere emociones propias", "Diseñar instrucciones para que adopte un estilo, tono, actitud o rol", "Entrenar un modelo nuevo desde cero"], 1, "Es una representación lingüística y conductual basada en instrucciones."],
  ["¿Cuáles son los dos pilares de un asistente eficaz?", ["Velocidad y memoria", "Conocimiento del dominio y habilidades comunicativas", "Tono y emoticonos"], 1, "Saber (dominio) y transmitirlo bien (comunicación)."],
  ["Un asistente responde «Depende, revise la política». ¿Qué le falta sobre todo?", ["Conocimiento del dominio", "Neuroticismo alto", "Nada, es una buena respuesta"], 0, "Sin datos concretos solo quedan generalidades vacías."],
  ["¿Qué representa la sigla OCEAN?", ["Los cinco rasgos en inglés: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism", "Un modelo de lenguaje de OpenAI", "Cinco tonos de voz para agentes"], 0, "Es la forma de recordar el Big Five."],
  ["Organización, sentido de responsabilidad y orientación a objetivos describen…", ["Apertura", "Responsabilidad (Conscientiousness)", "Amabilidad"], 1, "Clave en finanzas, auditoría y gestión de proyectos."],
  ["Para servicio al cliente, educación o consejería conviene un nivel alto de…", ["Amabilidad", "Neuroticismo", "Apertura baja"], 0, "Cooperación, empatía y búsqueda de la armonía."],
  ["Un neuroticismo moderado puede ser útil en…", ["Ventas", "Seguridad y gestión de riesgos", "Relaciones públicas"], 1, "Aporta cautela y vigilancia."],
  ["Con Extraversión BAJA, ante una invitación a salir con un grupo, lo esperable es…", ["Un rechazo amable y reservado", "Que organice la fiesta", "Un error del modelo"], 0, "Es el ejemplo de la clase: retraimiento social."],
  ["El Finance Agent debe priorizar…", ["Emoticonos y apoyo emocional", "Números y datos verificables", "Respuestas largas y creativas"], 1, "Tono formal, serio y meticuloso; lenguaje basado en hechos."],
  ["¿Para qué sirven los límites en el prompt de un agente?", ["Para que responda más rápido", "Para mantener su conducta controlada: no inventar, no salirse del dominio, no fingir emociones reales", "Porque el modelo no funciona sin ellos"], 1, "La personalidad se simula dentro de límites predefinidos y controlados."],
];
const respuestasQuiz = new Map();
$("#quiz").innerHTML = PREGUNTAS.map(([q, ops], i) => `<div class="q" data-q="${i}"><h3><b>${String(i + 1).padStart(2, "0")}</b>${esc(q)}</h3><div class="q__opts">${ops.map((o, j) => `<button type="button" data-o="${j}">${esc(o)}</button>`).join("")}</div><p class="q__why" hidden></p></div>`).join("");
$$(".q").forEach((box) => {
  const i = Number(box.dataset.q);
  const [, , ok, porque] = PREGUNTAS[i];
  $$("button", box).forEach((b) => b.addEventListener("click", () => {
    const j = Number(b.dataset.o);
    respuestasQuiz.set(i, j === ok);
    $$("button", box).forEach((x) => { x.disabled = true; if (Number(x.dataset.o) === ok) x.classList.add("is-ok"); });
    if (j !== ok) b.classList.add("is-bad");
    const why = $(".q__why", box); why.hidden = false; why.textContent = (j === ok ? "Correcto. " : "No exactamente. ") + porque;
    if (respuestasQuiz.size === PREGUNTAS.length) {
      const bien = [...respuestasQuiz.values()].filter(Boolean).length;
      const r = $("#quizResult");
      r.hidden = false;
      r.innerHTML = `<b>${bien}/10</b><div><strong>${bien >= 9 ? "¡Excelente! Dominas la simulación de personalidades." : bien >= 7 ? "Muy bien. Repasa los puntos donde fallaste." : "Buen intento. Vuelve a las estaciones de las preguntas que fallaste y repite."}</strong><p class="muted">Puedes recargar la página para intentarlo de nuevo.</p></div>`;
      if (bien >= 7) ganar("juego:quiz", PUNTOS.juego, "Reto final superado");
    }
  }));
});

const GLOSARIO = [
  ["Simulación de personalidad", "Diseño de instrucciones para que un modelo adopte un estilo, tono, actitud o rol durante una interacción."],
  ["Prompt de sistema", "Instrucciones iniciales que definen el rol, la personalidad y los límites de un agente."],
  ["Agente de IA", "Programa que usa un modelo de lenguaje para conversar o actuar con un objetivo definido."],
  ["Conocimiento del dominio", "Información actual, precisa y contextualizada del área en la que trabaja el agente."],
  ["Habilidades comunicativas", "Capacidad de transmitir el conocimiento con un lenguaje compartido y un estilo adecuado."],
  ["Big Five", "Modelo de los Cinco Grandes de la personalidad, también llamado Five Factor Model."],
  ["OCEAN", "Sigla de los cinco rasgos en inglés: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism."],
  ["Apertura (Openness)", "Imaginación, creatividad y receptividad a nuevas ideas."],
  ["Responsabilidad (Conscientiousness)", "Organización, sentido del deber y orientación a objetivos."],
  ["Extraversión (Extraversion)", "Sociabilidad, dinamismo y asertividad."],
  ["Amabilidad (Agreeableness)", "Cooperación, empatía y búsqueda de la armonía."],
  ["Neuroticismo (Neuroticism)", "Grado de estabilidad emocional y control frente al estrés; alto significa más sensibilidad a la ansiedad."],
  ["Tono", "Actitud con la que suena el mensaje: cálido, formal, entusiasta, sobrio…"],
  ["Registro / formalidad", "Nivel de formalidad del lenguaje según el contexto y el interlocutor."],
  ["Límites", "Reglas de lo que el agente nunca debe hacer, como inventar datos o salirse de su dominio."],
  ["Fuera de dominio", "Pregunta que no le corresponde al agente; lo correcto es decirlo y orientar."],
];
function pintarGlosario() {
  const q = $("#glossSearch").value.trim().toLowerCase();
  const f = GLOSARIO.filter(([t, d]) => !q || t.toLowerCase().includes(q) || d.toLowerCase().includes(q));
  $("#glossList").innerHTML = f.length ? f.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join("") : '<p class="muted">Sin resultados.</p>';
}
$("#glossSearch").addEventListener("input", pintarGlosario);

/* ================= Arranque ================= */
pintarPilares();
pintarRasgo("o");
vistosBig.clear();
pintarMezcla(false);
pintarDuelo(0);
duelosVistos.clear(); duelosVistos.add(0);
evaluar();
pintarPruebas();
pintarGlosario();
pintarProgreso();
pintarXP();
pintarReloj();
