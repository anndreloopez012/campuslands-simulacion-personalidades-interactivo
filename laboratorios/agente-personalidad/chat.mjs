#!/usr/bin/env node
// Conversa con un agente definido en un persona.json.
// Uso: node chat.mjs personas/hr-agent.json ["mensaje"]
// Sin ANTHROPIC_API_KEY ni OPENAI_API_KEY funciona en modo simulado.
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, argv, env, exit } from "node:process";
import { construirPrompt, validarPersona, simular } from "./src/personalidad.mjs";

const [, , archivo = "personas/hr-agent.json", ...resto] = argv;
const persona = JSON.parse(await readFile(archivo, "utf8"));
const errores = validarPersona(persona);
if (errores.length) {
  console.error(`La ficha ${archivo} está incompleta:\n- ${errores.join("\n- ")}`);
  exit(1);
}
const sistema = construirPrompt(persona);
const historial = [];

const proveedor = env.ANTHROPIC_API_KEY ? "claude" : env.OPENAI_API_KEY ? "openai" : "simulado";

async function preguntar(mensaje) {
  historial.push({ role: "user", content: mensaje });
  let texto;
  if (proveedor === "claude") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: env.IA_MODELO || "claude-haiku-5-5", max_tokens: 600, system: sistema, messages: historial }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`Claude respondió ${r.status}: ${j.error?.message ?? "error desconocido"}`);
    texto = j.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  } else if (proveedor === "openai") {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: env.IA_MODELO || "gpt-6-luna", instructions: sistema, input: historial, max_output_tokens: 600 }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`OpenAI respondió ${r.status}: ${j.error?.message ?? "error desconocido"}`);
    texto = j.output.filter((o) => o.type === "message").flatMap((o) => o.content).filter((c) => c.type === "output_text").map((c) => c.text).join("");
  } else {
    texto = simular(persona, mensaje);
  }
  historial.push({ role: "assistant", content: texto });
  return texto;
}

console.log(`Agente: ${persona.nombre} · proveedor: ${proveedor}${proveedor === "simulado" ? " (define ANTHROPIC_API_KEY u OPENAI_API_KEY para usar un modelo real)" : ""}\n`);

if (resto.length) {
  const mensaje = resto.join(" ");
  console.log(`Tú: ${mensaje}\n\n${persona.nombre}: ${await preguntar(mensaje)}`);
} else {
  const rl = createInterface({ input: stdin, output: stdout });
  console.log("Escribe tu mensaje. /prompt muestra el prompt de sistema, /salir termina.\n");
  for (;;) {
    const linea = (await rl.question("Tú: ")).trim();
    if (!linea) continue;
    if (linea === "/salir") break;
    if (linea === "/prompt") { console.log(`\n${sistema}\n`); continue; }
    try { console.log(`\n${persona.nombre}: ${await preguntar(linea)}\n`); }
    catch (e) { console.error(`\n${e.message}\n`); historial.pop(); }
  }
  rl.close();
}
