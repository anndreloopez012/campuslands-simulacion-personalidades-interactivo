// Construye el prompt de sistema de un agente a partir de su ficha (persona.json),
// valida la ficha y ofrece un modo simulado para practicar sin clave.

export const RASGOS = [
  ["apertura", "Apertura"],
  ["responsabilidad", "Responsabilidad"],
  ["extraversion", "Extraversión"],
  ["amabilidad", "Amabilidad"],
  ["neuroticismo", "Neuroticismo"],
];
export const NIVELES = ["baja", "media", "alta"];

// En los prompts de la clase se escribe «Neuroticismo: BAJO»; el resto va en femenino.
export function etiqueta(rasgo, nivel) {
  const masc = { baja: "BAJO", media: "MEDIO", alta: "ALTO" };
  return rasgo === "neuroticismo" ? masc[nivel] : nivel.toUpperCase();
}

const texto = (v) => typeof v === "string" && v.trim().length > 0;

/** Devuelve la lista de errores de la ficha. Vacía significa que está completa. */
export function validarPersona(p) {
  const errores = [];
  if (!p || typeof p !== "object") return ["La ficha debe ser un objeto JSON."];
  if (!texto(p.nombre)) errores.push("Falta «nombre».");
  if (!texto(p.rol)) errores.push("Falta «rol».");
  for (const [clave, nombre] of RASGOS) {
    const nivel = p.rasgos?.[clave];
    if (!NIVELES.includes(nivel)) errores.push(`«rasgos.${clave}» (${nombre}) debe ser baja, media o alta.`);
  }
  if (!Array.isArray(p.dominio) || p.dominio.filter(texto).length < 3) errores.push("«dominio» necesita al menos 3 datos.");
  for (const campo of ["tono", "lenguaje", "objetivo"]) if (!texto(p[campo])) errores.push(`Falta «${campo}».`);
  if (!Array.isArray(p.limites) || p.limites.filter(texto).length < 1) errores.push("«limites» necesita al menos 1 regla.");
  return errores;
}

/** Arma el prompt de sistema con el mismo formato que la página de la guía. */
export function construirPrompt(p) {
  const rasgos = RASGOS.map(([clave, nombre]) => `- ${nombre}: ${etiqueta(clave, p.rasgos[clave])}`).join("\n");
  const dominio = p.dominio.map((d) => `- ${d}`).join("\n");
  const limites = [...p.limites,
    "Eres una simulación: no afirmes tener emociones reales ni conciencia.",
    "Si una pregunta está fuera de tu dominio, dilo y orienta a la persona hacia quien corresponde.",
  ].map((l) => `- ${l}`).join("\n");
  return `Eres ${p.nombre}, ${p.rol}. Tus rasgos de personalidad siguen el modelo de los Cinco Grandes:\n${rasgos}\n\n`
    + `Conocimiento del dominio (úsalo como fuente; si algo no está aquí, dilo con honestidad):\n${dominio}\n\n`
    + `Tono de comunicación: ${p.tono}\nLenguaje: ${p.lenguaje}\nObjetivo: ${p.objetivo}\n\nLímites:\n${limites}`;
}

// Frases genéricas por rasgo y nivel para el modo simulado (orden: E, A, N, O, C).
const FRASES = {
  extraversion: { alta: "¡Hola! Qué gusto que me escribas.", media: "Hola, con gusto te ayudo.", baja: "Hola." },
  amabilidad: { alta: "Entiendo lo que me planteas y quiero ayudarte de verdad.", media: "Veamos tu consulta.", baja: "Vamos directo al punto." },
  neuroticismo: { alta: "Aunque me inquieta no tener todos los datos.", media: "Tomaré en cuenta los posibles riesgos.", baja: "Lo vemos con calma." },
  apertura: { alta: "Se me ocurren varias ideas distintas que podríamos explorar.", media: "Podemos considerar un par de opciones.", baja: "Lo haría de la forma establecida." },
  responsabilidad: { alta: "Te propongo un orden claro de pasos y un plazo para cada uno.", media: "Te doy los pasos principales.", baja: "Lo demás lo resolvemos después." },
};

/** Respuesta de práctica: no usa ningún modelo, solo muestra el efecto de cada rasgo. */
export function simular(p, mensaje) {
  const orden = ["extraversion", "amabilidad", "neuroticismo", "apertura", "responsabilidad"];
  const palabras = mensaje.toLowerCase().split(/[^a-záéíóúñü0-9]+/).filter((w) => w.length > 4);
  const dato = p.dominio.find((d) => palabras.some((w) => d.toLowerCase().includes(w)));
  const nucleo = dato ? `Según lo que sé: ${dato}.` : "Eso no está en mi conocimiento del dominio; te sugiero consultarlo con el área correspondiente.";
  const partes = orden.map((r) => FRASES[r][p.rasgos[r]]);
  partes.splice(2, 0, nucleo);
  return `[modo simulado] ${partes.join(" ")}`;
}
