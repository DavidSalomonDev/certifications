# Práctica de Certificaciones

App web para practicar exámenes de certificación (Azure, Google Cloud, ITIL, etc.), hecha con
**Next.js (App Router) + TypeScript + Tailwind CSS**. Sin login, sin backend: las preguntas se
sirven desde archivos JSON estáticos y tu progreso se guarda en el `localStorage` del navegador.

**Demo en vivo:** [davidsalomon.dev/certificaciones](https://davidsalomon.dev/certificaciones)
(redirige a [certifications-alpha.vercel.app](https://certifications-alpha.vercel.app/)).

## Despliegue

El repo está conectado a Vercel: cada push a `main` despliega automáticamente en
`certifications-alpha.vercel.app`. El dominio `davidsalomon.dev/certificaciones` redirige
(308 permanente, configurado en `next.config.mjs`) a esa URL de Vercel.

## Certificaciones incluidas

| Certificación | Preguntas jugables | Fuente |
| --- | --- | --- |
| AZ‑104: Microsoft Azure Administrator | 425 | CertyIQ |
| Google Cloud Associate Cloud Engineer | 197 | ExamTopics |
| ITIL 4 Foundation | 365 | CertyIQ |
| AZ‑700: Designing and Implementing Microsoft Azure Networking Solutions | 181 | CertyIQ |
| Google Professional Cloud Architect | 382 | CertyIQ |

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
- **Bilingüe (inglés / español)**: botón EN/ES en la cabecera que cambia el idioma del
  **contenido de las preguntas** (enunciado, opciones y explicación). Por defecto en inglés;
  recuerda tu preferencia. La interfaz sigue en español. Ver [Traducciones](#traducciones-inglés--español).
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
  <cert>.json             # preguntas de cada cert (generado), p. ej. az104.json, az-700.json
  <cert>.es.json          # traducciones al español (overlay opcional, ver "Traducciones")
public/images/<cert>/    # imágenes de preguntas, por certificación (generado)
scripts/
  convert.mjs              # convierte source/<cert>.md → public/data/<cert>.json
  extract_images.py        # extrae imágenes del PDF → public/images/ + source/<cert>.images.json
source/
  <cert>.md                # Markdown fuente de las preguntas
  <cert>.pdf               # PDF fuente (solo para extraer imágenes)
  <cert>.images.json       # mapa pregunta→imágenes (generado por extract_images.py, editable)
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
  "images": [],                    // rutas a imágenes de la pregunta (1 o varias) o vacío
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
  - `complex` — preguntas HOTSPOT/DRAG‑DROP/case‑study que no se pueden responder con opción
    múltiple. **Se excluyen del pool jugable**, aunque tengan imágenes. Quedan guardadas en el
    JSON para no perderlas.
- El **pool jugable** = preguntas con `type` `single` o `multiple` (ver `getPool()` en
  `lib/questions.ts`).

### Imágenes de preguntas

Muchas preguntas (diagramas de red, tablas, exhibits de case study, HOTSPOT/DRAG‑DROP) traen
imágenes. El campo `images` de cada pregunta es un array de rutas; se muestran apiladas al final
del enunciado, antes de las opciones. Puede tener 0, 1 o muchas imágenes.

Dos formas de poblarlo:

- **Automática (recomendada)**: extraer las imágenes del PDF con `scripts/extract_images.py`
  (ver [Extraer imágenes desde el PDF](#extraer-imágenes-desde-el-pdf)). Es el camino normal para
  los volcados de CertyIQ.
- **Manual**: coloca la imagen en `public/images/<cert>/` y añade su ruta al array, p. ej.
  `"images": ["/images/az104/q200.png"]`. Útil para correcciones puntuales.

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

## Extraer imágenes desde el PDF

Los volcados de CertyIQ traen un PDF con los diagramas/exhibits de cada pregunta.
`scripts/extract_images.py` los extrae y los asocia automáticamente a su pregunta.

### Requisitos

Python 3 + [PyMuPDF](https://pymupdf.readthedocs.io/):

```bash
python -m pip install PyMuPDF
```

### Uso

Deja el PDF en `source/<cert>.pdf` y corre:

```bash
python scripts/extract_images.py <cert>      # p. ej. az-700
npm run convert -- <cert>                     # vuelca las imágenes al JSON
```

El primer comando genera las imágenes y el mapa; el segundo las incorpora a
`public/data/<cert>.json`. **Siempre hay que correr `convert` después** para que la app las vea.

### Qué hace (y por qué funciona)

El PDF no dice qué imagen pertenece a qué pregunta, así que el script lo infiere:

1. **Descarta la plantilla.** El volcado repite en cada página el marco/fondo/logo de CertyIQ.
   Se filtran por: ancho de origen `535`/`557` px (las columnas del marco), contenido que aparece
   en **≥ 8 páginas** (logos/fondos), y tamaños mínimos (lado < 40 px o área < 60×60).
2. **Asocia por orden de lectura.** Recorre cada página de arriba hacia abajo y asigna cada imagen
   a la última cabecera `Question: N` que la precede. Las imágenes "se derraman" a páginas
   siguientes sin cabecera y siguen perteneciendo a la misma pregunta.
3. **Corta en `Explanation:`.** Las imágenes posteriores al marcador de explicación (los
   screenshots paso a paso del portal) se descartan: solo nos interesa el exhibit de la pregunta y,
   en HOTSPOT, la imagen de la respuesta resaltada (que va **antes** de `Explanation:`).
   - Las preguntas **case study** no tienen marcador `Explanation:`, así que conservan **todos**
     sus exhibits — que es lo correcto, porque el caso describe todo un entorno.
4. **Deduplica** imágenes idénticas dentro de una misma pregunta (una imagen alta partida entre dos
   páginas aparece dos veces; se guarda una sola vez).

### Salidas

- `public/images/<cert>/q<N>-<i>.<ext>` — los bytes nativos de cada imagen (sin recodificar).
  `<N>` es el número de pregunta, `<i>` el orden dentro de la pregunta.
- `source/<cert>.images.json` — el mapa `{ "10": ["q10-1.jpeg", ...] }`. **Es editable a mano.**

### Afinar a mano

La heurística acierta en la gran mayoría, pero puede colar una imagen de más (una franja pequeña)
o dejar una de menos. Como `source/<cert>.images.json` es texto plano, edítalo directamente
(quita/reordena nombres de archivo) y vuelve a correr **solo** `npm run convert -- <cert>`.
No hace falta reextraer ni tocar Python.

### Para una certificación nueva: revisa los filtros

Los umbrales están al inicio de `scripts/extract_images.py`:

```python
TEMPLATE_WIDTHS   = {535, 557}   # anchos del marco de página (¡específico del PDF!)
TEMPLATE_MIN_PAGES = 8           # mismo contenido en ≥N páginas = plantilla
MIN_DIM = 40                     # lado mínimo en px
MIN_AREA = 60 * 60               # área mínima en px
```

`TEMPLATE_WIDTHS` es lo más sensible: `{535, 557}` son los anchos del marco del PDF de **az‑700**.
Otro PDF puede usar otros anchos. Si en una cert nueva ves muchas imágenes basura o, al revés,
faltan diagramas, inspecciona primero el PDF: lista los anchos de imagen más repetidos por página
(con PyMuPDF: `doc[p].get_images()` + `doc.extract_image(xref)`) e identifica cuáles son el marco.
Ajusta `TEMPLATE_WIDTHS` y vuelve a extraer. Tras extraer, abre la app en modo random y revisa unas
cuantas preguntas con imagen para validar el resultado.

> Nota: las preguntas `complex` (HOTSPOT/DRAG/case‑study) reciben imágenes pero **siguen fuera del
> pool jugable** porque no se responden con opción múltiple. Las imágenes benefician hoy a las
> preguntas `single`/`multiple` que referencian un exhibit.

---

## Traducciones (inglés / español)

El contenido original de las preguntas está en inglés. Las traducciones al español viven en un
archivo **overlay** por certificación, `public/data/<cert>.es.json`, que se aplica encima del JSON
base en tiempo de carga (ver `lib/questions.ts`).

### Estado del progreso (para retomar en próximas sesiones)

Las traducciones se hacen por partes. Esta tabla indica hasta dónde se avanzó; **para continuar,
agregar al final del `.es.json` correspondiente desde el siguiente id.**

| Cert | Traducidas | Total | Siguiente | Estado |
| --- | --- | --- | --- | --- |
| AZ‑104 | q1–q83 | 634 | `az104-84` | 🟡 En progreso |
| AZ‑700 | — | 388 | `az-700-1` | ⬜ Pendiente |
| Google PCA | — | 385 | `pca-1` | ⬜ Pendiente |
| ITIL 4 | — | 365 | `itilv4-1` | ⬜ Pendiente |
| GCP ACE | — | 197 | `gcp-ace-1` | ⬜ Pendiente |

> Los ids son consecutivos (`<cert>-1`, `<cert>-2`, …). Para ver el texto base de un rango:
> `node -e 'require("./public/data/az104.json").slice(33,60).forEach(q=>console.log(q.id, q.question))'`
> (el `slice` usa índices 0-based: `slice(33, …)` empieza en `az104-34`).

### Cómo funciona

- El JSON base `<cert>.json` es la **fuente canónica** (inglés) y la única que tiene `answer`,
  `images`, `type` y `references`. Esos campos **no** se traducen.
- `<cert>.es.json` es un **mapa por id** que solo lleva los campos de texto traducidos. No hace
  falta traducir todas las preguntas: lo que falte cae a inglés (**fallback por campo**). Por eso
  se puede traducir "por partes".
- El botón EN/ES (componente `LanguageToggle`, estado en `lib/language.tsx`) cambia el idioma del
  contenido y recuerda la preferencia en `localStorage`. **Default: inglés.**

### Formato de `<cert>.es.json`

```jsonc
{
  "az104-1": {
    "question": "Su empresa tiene varios departamentos…",
    "options": [
      "Crear Azure Management Groups para cada departamento.",
      "Crear un resource group para cada departamento.",
      "Asignar tags a las máquinas virtuales.",
      "Modificar la configuración de las máquinas virtuales."
    ],
    "explanation": "C. Asignar tags a las máquinas virtuales…"
  }
}
```

Reglas:

- **La clave es el `id`** exacto de la pregunta en el JSON base (`<cert>-<n>`).
- **`options` debe conservar el mismo orden y cantidad** que el inglés: los índices de `answer`
  apuntan a esas posiciones. Si la cantidad no coincide, el overlay **ignora** las opciones
  traducidas y usa las inglesas (salvaguarda en `applyTranslations`).
- Cualquier campo (`question`, `options`, `explanation`) es opcional; lo omitido queda en inglés.

### Regla de traducción: conservar nombres propios en inglés

Al traducir, se **mantienen en inglés** los nombres comerciales de productos y los términos de
arquitectura, porque así aparecen en el examen real y en la documentación oficial. Solo se traduce
la prosa que los rodea. Ejemplos de lo que se deja en inglés:

- Productos/servicios: `Azure Active Directory (Azure AD)`, `Multi-Factor Authentication`,
  `Conditional Access`, `Azure Management Groups`, `App Engine`, `Compute Engine`, `BigQuery`…
- Arquitectura/recursos: `resource group`, `subnet`, `load balancer`, `backend pool`, `peering`,
  `tags`, `Site-to-Site VPN`, `Global Administrators`…
- Comandos, cmdlets, nombres de recursos y código: **verbatim** (`az vm create`, `New-AzVM`, `RG1`…).

### Generar las traducciones

Son texto, no código: se escriben directamente en `public/data/<cert>.es.json`. Por volumen
(~1.969 preguntas entre todas las certs) se traduce **por partes / por certificación**. No hace
falta correr ningún script ni `convert` después: la app lee el `.es.json` directamente.

> Si en el futuro quisieras traducir todo de forma desatendida, lo escalable es un script que llame
> a la API de Claude con la "regla de traducción" de arriba como instrucción; requiere
> `ANTHROPIC_API_KEY` y tiene costo por uso.

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
3. (Opcional) Si tienes el PDF y quieres las imágenes, deja `source/<cert>.pdf` y corre
   `python scripts/extract_images.py <cert>` (ver [Extraer imágenes desde el PDF](#extraer-imágenes-desde-el-pdf)).
4. Corre `npm run convert -- <cert>`.

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
