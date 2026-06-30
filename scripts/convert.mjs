// scripts/convert.mjs
//
// Convierte un archivo Markdown de preguntas (formato CertyIQ) a un JSON
// consumible por la app. Reproducible: si editas el .md, vuelve a correrlo.
//
// Uso:
//   npm run convert -- az104
//   node scripts/convert.mjs az104
//
// Cómo agregar una certificación nueva:
//   1) Deja su Markdown en source/<cert>.md con el mismo formato.
//   2) Agrega una entrada a CERTS (abajo) con su nombre legible.
//   3) Corre `npm run convert -- <cert>`.
// El script regenera public/data/<cert>.json y actualiza public/data/certifications.json.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_DIR = join(ROOT, "source");
const DATA_DIR = join(ROOT, "public", "data");

// Registro de certificaciones conocidas. El "name" es lo que ve el usuario.
const CERTS = {
  az104: {
    name: "AZ-104: Microsoft Azure Administrator",
    source: "az104.md",
  },
  // az900: { name: "AZ-900: Azure Fundamentals", source: "az900.md" },
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Divide el contenido en bloques de pregunta usando las líneas "Question: N". */
function splitIntoBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let current = null;
  const qHeader = /^Question:\s*(\d+)\b/;

  for (const line of lines) {
    const m = line.match(qHeader);
    if (m) {
      if (current) blocks.push(current);
      current = { number: Number(m[1]), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
    // Líneas antes de la primera "Question:" (preámbulo) se descartan.
  }
  if (current) blocks.push(current);
  return blocks;
}

const isOption = (line) => line.match(/^([A-Z])\.\s+(.*)$/);
const isAnswer = (line) => line.match(/^Answer:\s*(.*)$/i);
const isExplanation = (line) => line.match(/^Explanation:\s*(.*)$/i);
const isReference = (line) => line.match(/^References?:\s*(.*)$/i);

/** Extrae las letras de una línea Answer (ej. "AC", "A, C", "ABCDE"). */
function parseAnswerLetters(raw) {
  const m = raw.trim().match(/^([A-Z](?:[,\s]*[A-Z])*)/);
  if (!m) return [];
  const letters = m[1].replace(/[^A-Z]/g, "").split("");
  return [...new Set(letters)]; // sin duplicados
}

/**
 * Reflujo del texto: el Markdown fuente viene con saltos de línea a mitad de
 * oración (envoltura del PDF). Unimos esas líneas y dejamos un salto solo cuando
 * la línea anterior terminó una oración (., ?, !, :). Así cada oración queda en
 * su propia línea y desaparecen los cortes feos a media frase.
 */
function reflow(lines) {
  const out = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (out.length === 0) {
      out.push(l);
    } else if (/[.?!:]$/.test(out[out.length - 1])) {
      out.push(l); // la anterior cerró oración → nueva línea
    } else {
      out[out.length - 1] += " " + l; // envoltura a media frase → unir
    }
  }
  return out.join("\n");
}

/** Convierte un bloque crudo en un objeto pregunta normalizado. */
function parseBlock(certId, block) {
  const questionLines = [];
  const options = [];
  let answerRaw = "";
  const explanationLines = [];
  const referenceLines = [];

  let state = "question"; // question -> options -> answer -> explanation -> references
  const isComplexMarker = /^(HOTSPOT|DRAG DROP)\b/i;
  let markedComplex = false;

  for (const rawLine of block.lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (isAnswer(trimmed)) {
      answerRaw = isAnswer(trimmed)[1];
      state = "answer";
      continue;
    }
    if (isExplanation(trimmed)) {
      const rest = isExplanation(trimmed)[1];
      if (rest) explanationLines.push(rest);
      state = "explanation";
      continue;
    }
    if (isReference(trimmed)) {
      const rest = isReference(trimmed)[1];
      if (rest) referenceLines.push(rest);
      state = "references";
      continue;
    }

    if (state === "question") {
      if (isComplexMarker.test(trimmed)) {
        markedComplex = true;
        continue; // no incluimos el marcador en el texto
      }
      const opt = isOption(trimmed);
      if (opt) {
        options.push(opt[2].trim());
        state = "options";
      } else if (trimmed) {
        questionLines.push(trimmed);
      }
    } else if (state === "options") {
      const opt = isOption(trimmed);
      if (opt) {
        options.push(opt[2].trim());
      } else if (trimmed) {
        // continuación de la última opción (texto envuelto en varias líneas)
        options[options.length - 1] += " " + trimmed;
      }
    } else if (state === "explanation") {
      if (trimmed) explanationLines.push(trimmed);
    } else if (state === "references") {
      if (trimmed) referenceLines.push(trimmed);
    }
    // estado "answer": ignoramos líneas sueltas hasta Explanation/Reference
  }

  // Referencias: cualquier URL que aparezca en explicación o en el bloque de referencias.
  const urlRegex = /https?:\/\/[^\s)]+/g;
  const references = [];
  for (const l of [...explanationLines, ...referenceLines]) {
    const found = l.match(urlRegex);
    if (found) references.push(...found);
  }
  // Explicación: quitamos las líneas que son solo una URL (ya están en references)
  // y reflujamos el resto para arreglar los saltos de línea.
  const explanation = reflow(
    explanationLines.filter((l) => !/^https?:\/\/\S+$/.test(l.trim())),
  ).trim();

  // Respuesta y clasificación.
  const letters = parseAnswerLetters(answerRaw);
  const answer = letters
    .map((ch) => LETTERS.indexOf(ch))
    .filter((idx) => idx >= 0 && idx < options.length)
    .sort((a, b) => a - b);

  const allLettersValid =
    letters.length > 0 && answer.length === letters.length;

  let type;
  if (markedComplex || options.length < 2 || !allLettersValid) {
    type = "complex";
  } else if (answer.length === 1) {
    type = "single";
  } else {
    type = "multiple";
  }

  return {
    id: `${certId}-${block.number}`,
    question: reflow(questionLines).trim(),
    options,
    answer,
    explanation,
    references: [...new Set(references)],
    image: null,
    type,
    topic: null,
  };
}

/** Actualiza (o crea) public/data/certifications.json con el conteo jugable. */
function updateRegistry(certId, name, playableCount) {
  const registryPath = join(DATA_DIR, "certifications.json");
  let registry = [];
  if (existsSync(registryPath)) {
    try {
      registry = JSON.parse(readFileSync(registryPath, "utf8"));
    } catch {
      registry = [];
    }
  }
  const entry = {
    id: certId,
    name,
    file: `${certId}.json`,
    questionCount: playableCount,
    enabled: playableCount > 0,
  };
  const idx = registry.findIndex((c) => c.id === certId);
  if (idx >= 0) registry[idx] = { ...registry[idx], ...entry };
  else registry.push(entry);
  writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  return registry;
}

function main() {
  const certId = process.argv[2];
  if (!certId) {
    console.error("Falta el id de certificación. Uso: npm run convert -- az104");
    console.error("Disponibles en source/:", readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".md")).join(", "));
    process.exit(1);
  }
  const cfg = CERTS[certId];
  if (!cfg) {
    console.error(`Cert "${certId}" no está en el registro CERTS de scripts/convert.mjs.`);
    process.exit(1);
  }

  const sourcePath = join(SOURCE_DIR, cfg.source);
  if (!existsSync(sourcePath)) {
    console.error(`No se encontró el archivo fuente: ${sourcePath}`);
    process.exit(1);
  }

  const text = readFileSync(sourcePath, "utf8");
  const blocks = splitIntoBlocks(text);
  const questions = blocks.map((b) => parseBlock(certId, b));

  // Sanidad: ids únicos.
  const ids = new Set();
  for (const q of questions) {
    if (ids.has(q.id)) console.warn(`⚠ id duplicado: ${q.id}`);
    ids.add(q.id);
  }

  const counts = { single: 0, multiple: 0, complex: 0 };
  for (const q of questions) counts[q.type]++;
  const playable = counts.single + counts.multiple;

  const outPath = join(DATA_DIR, `${certId}.json`);
  writeFileSync(outPath, JSON.stringify(questions, null, 2) + "\n");
  updateRegistry(certId, cfg.name, playable);

  console.log(`\n✅ ${certId}: ${questions.length} preguntas procesadas`);
  console.log(`   • single   : ${counts.single}`);
  console.log(`   • multiple : ${counts.multiple}`);
  console.log(`   • complex  : ${counts.complex} (excluidas del pool: dependen de imágenes)`);
  console.log(`   ► Pool jugable: ${playable}`);
  console.log(`   → ${outPath}`);
  console.log(`   → ${join(DATA_DIR, "certifications.json")}\n`);
}

main();
