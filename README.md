# Práctica de Certificaciones

App web local para practicar exámenes de certificación, hecha con **Next.js (App Router) +
TypeScript + Tailwind CSS**. Sin login, sin backend: las preguntas se sirven desde archivos JSON
estáticos y tu progreso se guarda en el `localStorage` del navegador.

## Certificaciones incluidas

| Certificación | Preguntas jugables | Fuente |
| --- | --- | --- |
| AZ‑104: Microsoft Azure Administrator | 425 | CertyIQ |
| Google Cloud Associate Cloud Engineer | 197 | ExamTopics |
| ITIL 4 Foundation | 365 | CertyIQ |

Ver [Agregar una certificación nueva](#agregar-una-certificación-nueva) para sumar otra.

## Funcionalidad

- **Modo práctica**: elige 10/20/30/40/50 preguntas al azar (sin repetir dentro de la sesión),
  respóndelas todas y revisa al final el resultado (correctas, incorrectas, %) con el repaso
  pregunta por pregunta (tu respuesta vs. la correcta + explicación).
  - **Sin feedback inmediato**: solo ves los aciertos al finalizar.
  - **Reanudable**: si recargas o cierras el navegador, retomas donde ibas mientras no hayas
    finalizado el quiz.
- **Modo pregunta random**: una pregunta a la vez con respuesta y explicación inmediata; el
  botón "Otra pregunta" trae otra sin repetir hasta agotar el pool.
- **Cronómetro**: el modo práctica mide el tiempo del test (se pausa al salir del quiz y
  continúa al retomar); el total aparece en los resultados.
- **Modo oscuro**: botón 🌙/☀️ en la cabecera; recuerda tu preferencia y respeta la del
  sistema en la primera visita.
- **Multi‑certificación**: agregar un examen nuevo no requiere tocar código (ver abajo).

---

## Cómo ejecutar

Requiere Node.js 18+.

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. Si solo hay una certificación activa, entra directo a ella.

Para producción:

```bash
npm run build
npm start
```

---

## Estructura del proyecto

```
app/
  page.tsx                 # selector de certificación (redirige si solo hay una)
  [cert]/page.tsx          # home del cert: selector N, iniciar quiz, modo random, continuar
  [cert]/quiz/page.tsx     # modo práctica (resultados incluidos)
  [cert]/random/page.tsx   # modo pregunta random
components/                # UI reutilizable (QuestionCard, AnswersList, QuizRunner, etc.)
lib/                       # tipos y lógica
  types.ts                 # Question, Certification, QuizSession…
  certifications.ts        # carga el registro de certs        ← capa de datos
  questions.ts             # carga preguntas + getPool()        ← capa de datos
  storage.ts               # persistencia en localStorage
  quiz.ts                  # puntuación (isCorrect, computeResults)
  random.ts                # barajado y muestreo sin repetición
public/data/
  certifications.json    # registro de certificaciones
  az104.json              # preguntas AZ‑104 (generado)
  gcp-ace.json            # preguntas Google Cloud ACE (generado)
  itilv4.json             # preguntas ITIL 4 Foundation (generado)
public/images/<cert>/    # imágenes opcionales de preguntas, por certificación
scripts/convert.mjs        # convierte source/<cert>.md → public/data/<cert>.json
source/                    # Markdown/PDF fuente de las preguntas
```

---

## Formato de los datos

### `public/data/certifications.json`

Registro de certificaciones. Cada entrada:

```json
[
  {
    "id": "az104",
    "name": "AZ-104: Microsoft Azure Administrator",
    "file": "az104.json",
    "questionCount": 425,
    "enabled": true
  }
]
```

### `public/data/<cert>.json`

Array de preguntas. Cada pregunta:

```jsonc
{
  "id": "az104-1",                 // identificador único
  "question": "Texto de la pregunta…",
  "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
  "answer": [2],                   // ÍNDICES (0-based) de las opciones correctas
  "explanation": "Por qué la respuesta es correcta…",
  "references": ["https://…"],     // enlaces (puede ir vacío)
  "image": null,                   // "/images/az104/q123.png" o null
  "type": "single",               // "single" | "multiple" | "complex"
  "topic": null                    // categoría/tema (reservado para el futuro)
}
```

Notas:

- **`answer` es siempre un array de índices.** Respuesta única → `[2]`; multi‑respuesta → `[0, 2]`.
  Una respuesta cuenta como correcta solo si el conjunto seleccionado es **exactamente igual**
  al conjunto correcto (no hay aciertos parciales).
- **`type`**:
  - `single` — una sola respuesta correcta (radio buttons).
  - `multiple` — varias respuestas correctas (checkboxes).
  - `complex` — preguntas HOTSPOT/DRAG‑DROP que dependen de imágenes/tablas. **Se excluyen del
    pool jugable** hasta que tengan su imagen. Quedan guardadas en el JSON para no perderlas.
- El **pool jugable** = preguntas con `type` `single` o `multiple` (ver `getPool()` en
  `lib/questions.ts`).

### Imágenes de preguntas

Coloca la imagen en `public/images/<cert>/` y referencia su ruta en `image`, p. ej.
`"image": "/images/az104/q200.png"`. La pregunta la mostrará automáticamente.

---

## Generar el JSON desde un Markdown

El JSON se puede regenerar desde el Markdown fuente con:

```bash
npm run convert -- az104
npm run convert -- gcp-ace
npm run convert -- itilv4
```

Cada corrida lee `source/<cert>.md`, escribe `public/data/<cert>.json`, actualiza
`certifications.json` con el conteo jugable e imprime un resumen por tipo.

Si editas las preguntas a mano directamente en el JSON, **no** necesitas correr el script.

---

## Agregar una certificación nueva

Tienes dos caminos:

**A) Tengo un JSON ya armado**

1. Deja `public/data/<cert>.json` con el formato de arriba.
2. Agrega una línea a `public/data/certifications.json` (`id`, `name`, `file`,
   `questionCount`, `enabled: true`).

¡Listo! No se toca código.

**B) Tengo un Markdown fuente**

1. Deja el Markdown en `source/<cert>.md`.
2. Registra el cert en `CERTS` dentro de `scripts/convert.mjs` con su `id`, `name`, `source` y
   `format`.
3. Corre `npm run convert -- <cert>`.

El conversor soporta dos formatos de volcado (campo `format`):

| `format` | Estructura del Markdown | Ejemplo |
| --- | --- | --- |
| `certyiq` | `Question: N` · opciones `A.` · `Answer:` · `Explanation:` · `Reference:` | AZ-104, ITIL 4 |
| `examtopics` | `Question #N` · opciones `A.` · `Correct Answer:` · `Community vote distribution` | GCP ACE |

(El parser `certyiq` acepta opciones con o sin espacio tras el punto: `A. texto` y `A.texto`.)

Notas del formato **examtopics**:

- Cuando el "Correct Answer" oficial y el voto de la comunidad difieren, se toma **el voto de
  la comunidad** (suele ser más confiable); el dato oficial se guarda como nota en
  `explanation`. Cambia esta política en `parseBlockExamTopics()` si prefieres lo contrario.
- Detecta `(Choose two/three)` para fijar cuántas respuestas son correctas.
- Recupera preguntas cuyo encabezado `Question #N` se perdió en el OCR (bloques con 2+
  `Correct Answer:` se vuelven a dividir).

Para un formato nuevo, agrega un par `splitIntoBlocksX` + `parseBlockX` y enchúfalo en el
dispatch de `main()`.

---

## Escalar a futuro

El diseño deja los puntos de extensión aislados:

- **Migrar a una base de datos**: las únicas funciones que tocan los datos son las de
  `lib/certifications.ts` y `lib/questions.ts` (hoy hacen `fetch` a los JSON). Reemplázalas por
  llamadas a tu API/DB manteniendo los tipos `Certification` y `Question`; el resto de la app no
  cambia.
- **Clasificar por tema**: rellena el campo `topic` de cada pregunta, añade el filtro por tema
  dentro de `getPool()` en `lib/questions.ts` y un selector de tema en la home del cert.
- **Estadísticas avanzadas**: hoy la sesión se guarda en `localStorage` (ver `lib/storage.ts`).
  Para históricos o sincronización entre dispositivos, persiste esos mismos objetos en una BD.

---

## Privacidad

No hay cuentas ni servidores: todo (preguntas y progreso) vive en tu navegador. Borrar los
datos del sitio reinicia tu progreso.

---

## Historial de cambios

Ver [CHANGELOG.md](./CHANGELOG.md).
