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
// "format" elige el parser: "certyiq" (Question:/Answer:/Explanation:) o
// "examtopics" (Question #N/Correct Answer/Community vote distribution).
const CERTS = {
  az104: {
    name: "AZ-104: Microsoft Azure Administrator",
    source: "az104.md",
    format: "certyiq",
  },
  "gcp-ace": {
    name: "Google Cloud Associate Cloud Engineer",
    source: "gcp-ace.md",
    format: "examtopics",
  },
  itilv4: {
    name: "ITIL 4 Foundation",
    source: "itilv4.md",
    format: "certyiq",
  },
  "az-700": {
    name: "AZ-700: Designing and Implementing Microsoft Azure Networking Solutions",
    source: "az-700.md",
    format: "certyiq",
  },
  pca: {
    name: "Google Professional Cloud Architect",
    source: "pca.md",
    format: "certyiq",
  },
  // az900: { name: "AZ-900: Azure Fundamentals", source: "az900.md", format: "certyiq" },
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

// Acepta "A. texto" y también "A.texto" (algunos volcados omiten el espacio).
const isOption = (line) => line.match(/^([A-Z])\.\s*(\S.*)$/);
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

// ===================== Formato ExamTopics =====================

/** Divide en bloques usando las cabeceras "Question #N ...". */
function splitIntoBlocksExamTopics(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let current = null;
  const qHeader = /^Question #(\d+)\b/;
  for (const line of lines) {
    const m = line.match(qHeader);
    if (m) {
      if (current) blocks.push(current);
      current = { number: Number(m[1]), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

/**
 * A veces el OCR pierde la cabecera "Question #N" y dos preguntas quedan
 * fusionadas en un bloque (se detecta por tener 2+ "Correct Answer:"). Aquí
 * re-dividimos: tras una respuesta y su cola (voto/referencia/ruido), la primera
 * línea de prosa nueva inicia la siguiente pregunta. Los números perdidos se
 * recuperan como base+1, base+2, … (las cabeceras perdidas son consecutivas).
 */
function resplitMergedBlocks(blocks) {
  const isAnswerLine = (l) => /^Correct Answer:/i.test(l);
  const isTail = (l) =>
    isETVote(l) ||
    isETNoise(l) ||
    /^References?:/i.test(l) ||
    /^https?:\/\/\S+$/.test(l) ||
    isAnswerLine(l);

  const result = [];
  for (const block of blocks) {
    // Solo re-dividimos si hay 2+ "Correct Answer:" (señal fiable de fusión).
    const answerCount = block.lines.filter((l) => isAnswerLine(l.trim())).length;
    if (answerCount < 2) {
      result.push(block);
      continue;
    }
    const subs = [[]];
    let seenAnswer = false;
    for (const raw of block.lines) {
      const l = raw.trim();
      const cur = subs[subs.length - 1];
      if (seenAnswer && l && !isTail(l)) {
        subs.push([raw]); // empieza una nueva pregunta
        seenAnswer = false;
      } else {
        cur.push(raw);
        if (isAnswerLine(l)) seenAnswer = true;
      }
    }
    subs.forEach((lines, i) =>
      result.push({ number: block.number + i, lines }),
    );
  }
  return result;
}

// Ruido típico del volcado de ExamTopics que debe descartarse.
const ET_NOISE = [
  /^\d{1,2}\/\d{1,2}\/\d{2,4},/, // "10/9/22, 7:19 PM ..." cabecera de página
  /examtopics\.com/i, // pies de página con URL malformada
  /^Topic \d+/i,
  /^=?XAMTOPICS/i,
  /Custom View Settings/i,
  /Expert Verified/i,
  /^Most Voted/i,
  /^Community vote distribution/i,
];
const isETNoise = (l) => ET_NOISE.some((re) => re.test(l));
// Línea de voto comunitario: "C (100%)", "B (94%) 6%", "BD (50%) ...".
const isETVote = (l) => /^[A-Z]{1,3}\s*\(\d+%\)/.test(l.trim());

/** Letras iniciales de un voto/respuesta: "B (94%)" -> "B"; "BD (50%)" -> "BD". */
function leadingLetters(raw) {
  const m = (raw || "").trim().match(/^([A-Z]{1,4})/);
  return m ? [...new Set(m[1].split(""))] : [];
}

/** Parsea un bloque ExamTopics a una pregunta normalizada. */
function parseBlockExamTopics(certId, block) {
  const questionLines = [];
  const options = [];
  let correctRaw = "";
  let communityRaw = "";
  const references = [];

  let state = "question"; // question -> options -> answer/reference
  let expected = "A"; // siguiente letra de opción esperada

  for (const rawLine of block.lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Captura el primer voto comunitario y descarta el resto del ruido.
    if (isETVote(line)) {
      if (!communityRaw) communityRaw = line;
      continue;
    }
    if (isETNoise(line)) continue;

    const ans = line.match(/^Correct Answer:\s*(.+)$/i);
    if (ans) {
      correctRaw = ans[1];
      state = "answer";
      continue;
    }
    if (/^References?:/i.test(line)) {
      state = "reference";
      continue;
    }

    // URLs (referencias) en cualquier punto tras la respuesta.
    const urls = line.match(/https?:\/\/[^\s)]+/g);
    if (state === "reference" || state === "answer") {
      if (urls) references.push(...urls);
      continue;
    }

    // Detección de opciones: la letra debe ser la siguiente esperada
    // (admite "A.0.0.0.0/0" sin espacio tras el punto).
    const opt = line.match(/^([A-Z])[.)]\s*(.+)$/);
    if (opt && opt[1] === expected) {
      options.push(opt[2].trim());
      expected = LETTERS[LETTERS.indexOf(expected) + 1];
      state = "options";
      continue;
    }

    if (state === "options") {
      options[options.length - 1] += " " + line; // continuación de opción
    } else {
      questionLines.push(line); // texto de la pregunta
    }
  }

  // Respuesta: preferimos el voto de la comunidad cuando es válido; si no, el
  // "Correct Answer" oficial de ExamTopics.
  const correctLetters = parseAnswerLetters(correctRaw);
  const communityLetters = leadingLetters(communityRaw);
  const toIdx = (letters) =>
    letters
      .map((ch) => LETTERS.indexOf(ch))
      .filter((i) => i >= 0 && i < options.length)
      .sort((a, b) => a - b);

  const communityIdx = toIdx(communityLetters);
  const officialIdx = toIdx(correctLetters);

  // "(Choose two/three)" fija cuántas respuestas se esperan.
  const qText = questionLines.join(" ");
  const chooseMatch = qText.match(/choose\s+(two|three|2|3)/i);
  const expectedCount = chooseMatch
    ? /three|3/i.test(chooseMatch[1])
      ? 3
      : 2
    : null;

  let answer;
  let useCommunity;
  if (expectedCount) {
    // Preferimos la fuente que dé exactamente el número esperado (comunidad antes).
    if (communityIdx.length === expectedCount) {
      answer = communityIdx;
      useCommunity = true;
    } else if (officialIdx.length === expectedCount) {
      answer = officialIdx;
      useCommunity = false;
    } else {
      answer = communityIdx.length ? communityIdx : officialIdx;
      useCommunity = communityIdx.length > 0;
    }
  } else {
    // Respuesta única (caso habitual): voto de la comunidad si es válido.
    useCommunity =
      communityIdx.length > 0 && communityIdx.length === communityLetters.length;
    answer = useCommunity ? communityIdx : officialIdx;
  }

  // Sin explicación en la fuente: sintetizamos una nota con el voto y la
  // respuesta oficial cuando difieren (da contexto al estudiar).
  const explLines = [];
  if (communityRaw) explLines.push(`Voto de la comunidad: ${communityRaw}.`);
  if (
    correctLetters.length &&
    correctLetters.join("") !== (useCommunity ? communityLetters : correctLetters).join("")
  ) {
    explLines.push(`Respuesta marcada por ExamTopics: ${correctLetters.join("")}.`);
  } else if (correctLetters.length && !communityRaw) {
    explLines.push(`Respuesta marcada por ExamTopics: ${correctLetters.join("")}.`);
  }
  const explanation = explLines.join("\n");

  const allValid = answer.length > 0;
  let type;
  if (options.length < 2 || !allValid) type = "complex";
  else if (answer.length === 1) type = "single";
  else type = "multiple";

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
  const format = cfg.format ?? "certyiq";
  const questions =
    format === "examtopics"
      ? resplitMergedBlocks(splitIntoBlocksExamTopics(text)).map((b) =>
          parseBlockExamTopics(certId, b),
        )
      : splitIntoBlocks(text).map((b) => parseBlock(certId, b));

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
