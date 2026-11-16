import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { construirPrompt, validarPersona, simular, etiqueta } from "../src/personalidad.mjs";

const dir = new URL("../personas/", import.meta.url);
const fichas = (await readdir(dir)).filter((f) => f.endsWith(".json") && f !== "plantilla.json");

for (const f of fichas) {
  test(`la ficha ${f} está completa`, async () => {
    const p = JSON.parse(await readFile(new URL(f, dir), "utf8"));
    assert.deepEqual(validarPersona(p), []);
  });
}

test("la plantilla vacía reporta lo que falta", async () => {
  const p = JSON.parse(await readFile(new URL("plantilla.json", dir), "utf8"));
  const errores = validarPersona(p);
  assert.ok(errores.some((e) => e.includes("nombre")));
  assert.ok(errores.some((e) => e.includes("dominio")));
});

test("rechaza niveles fuera de baja, media o alta", () => {
  const errores = validarPersona({ nombre: "X", rol: "Y", rasgos: { apertura: "muy alta" } });
  assert.ok(errores.some((e) => e.includes("rasgos.apertura")));
});

test("el prompt lista los cinco rasgos y los límites de seguridad", async () => {
  const p = JSON.parse(await readFile(new URL("hr-agent.json", dir), "utf8"));
  const prompt = construirPrompt(p);
  for (const r of ["Apertura: MEDIA", "Responsabilidad: ALTA", "Extraversión: MEDIA", "Amabilidad: ALTA", "Neuroticismo: BAJO"]) assert.ok(prompt.includes(r), r);
  assert.ok(prompt.includes("no afirmes tener emociones reales"));
  assert.ok(prompt.includes("fuera de tu dominio"));
});

test("neuroticismo se escribe en masculino, como en la clase", () => {
  assert.equal(etiqueta("neuroticismo", "baja"), "BAJO");
  assert.equal(etiqueta("amabilidad", "alta"), "ALTA");
});

test("el modo simulado usa el dominio cuando la pregunta lo toca", async () => {
  const p = JSON.parse(await readFile(new URL("hr-agent.json", dir), "utf8"));
  assert.match(simular(p, "¿Cuántos días de vacaciones me tocan?"), /15 días hábiles/);
  assert.match(simular(p, "¿Qué película me recomiendas?"), /no está en mi conocimiento/);
});
