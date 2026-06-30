# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Este proyecto no sigue versionado semántico estricto (es una app interna sin publicar).

## [0.2.0] - 2026-06-29

### Añadido
- **Google Cloud Associate Cloud Engineer** (197 preguntas jugables) a partir de
  `source/gcp-ace.md`.
- **ITIL 4 Foundation** (365 preguntas jugables) a partir de `source/itilv4.md`.
- Soporte en `scripts/convert.mjs` para múltiples **formatos de origen** vía el campo
  `format` por certificación:
  - `certyiq` (ya existente, usado por AZ‑104 e ITIL 4).
  - `examtopics` (nuevo, usado por GCP ACE): cabeceras `Question #N`, `Correct Answer:` y
    voto de la comunidad (`Community vote distribution`).
- Política de resolución de respuesta para el formato `examtopics`: se usa el **voto de la
  comunidad** cuando es válido (suele ser más confiable que la etiqueta oficial); el dato
  oficial de ExamTopics se conserva como nota dentro de `explanation`.
- Detección de `(Choose two/three)` en preguntas de GCP ACE para preguntas de multi‑respuesta.
- Recuperación automática de preguntas de ExamTopics cuyo encabezado `Question #N` se perdió
  en el volcado OCR (bloques con 2+ `Correct Answer:` se vuelven a dividir en
  `resplitMergedBlocks()`).
- Sección "Certificaciones incluidas" en el README con la tabla de conteos por examen.

### Corregido
- El parser `certyiq` exigía un espacio tras el punto de cada opción (`A. texto`). Se relajó
  para aceptar también `A.texto` (sin espacio), formato presente en ITIL 4. Esto además
  **recuperó ~94 preguntas de AZ‑104** que antes se clasificaban incorrectamente como
  `complex` por no poder leer sus opciones (passó de 331 a **425** preguntas jugables).

## [0.1.0] - 2026-06-29

### Añadido
- Scaffold inicial de la app: **Next.js (App Router) + TypeScript + Tailwind CSS**, sin
  backend ni login.
- Arquitectura **multi‑certificación** desde el inicio: registro `certifications.json` +
  un `<cert>.json` por examen; rutas `/[cert]`, `/[cert]/quiz`, `/[cert]/random`.
- **Modo práctica**: selector de 10/20/30/40/50 preguntas, navegación libre entre preguntas,
  sin feedback hasta finalizar, resultados con repaso (correcta/incorrecta + explicación).
- **Modo pregunta random**: una pregunta a la vez con feedback y explicación inmediatos, sin
  repetir hasta agotar el pool.
- **Persistencia local** (sin login) en `localStorage`, con claves aisladas por
  certificación: sesión de práctica reanudable tras recargar, e historial del modo random.
- **Soporte multi‑respuesta** (checkboxes) con scoring por igualdad exacta de conjuntos.
- **Cronómetro** del modo práctica: corre mientras el quiz está abierto, se pausa al salir y
  continúa al retomar; el tiempo total aparece en los resultados.
- **Modo oscuro**: toggle persistente, respeta `prefers-color-scheme` en la primera visita,
  script anti‑flash en el `<head>`.
- **Reflujo de texto** en el conversor: las preguntas/explicaciones del Markdown fuente (con
  saltos de línea a media frase por el wrap del PDF) se recomponen en oraciones completas
  antes de guardarse en el JSON.
- Script `scripts/convert.mjs` (`npm run convert -- <cert>`) que transforma el Markdown
  fuente (formato CertyIQ) en `public/data/<cert>.json`, clasificando cada pregunta como
  `single`, `multiple` o `complex` (HOTSPOT/DRAG‑DROP sin opciones, excluidas del pool hasta
  tener imagen).
- Primer dataset: **AZ‑104: Microsoft Azure Administrator** (331 preguntas jugables en esta
  versión).
- `README.md` con documentación de formato de datos, cómo agregar una certificación y puntos
  de extensión (migrar a BD, clasificar por tema).
