// Curated examples for existing, high-intent pages. Keep each example tied to
// the actual engine output; these are illustrations, not sample files or claims
// that a particular visitor's result will be identical.
export const priorityUpdated = '2026-11-23';
export const priorityExamples = {
  'pdf-a-word': {
    next: 'imagen-a-texto',
    es: { title: 'Editar un contrato digital', input: 'Un PDF de cuatro páginas donde puedes seleccionar una frase con el cursor.', result: 'Un DOCX con texto editable y saltos entre las páginas originales; la maquetación puede simplificarse.', verify: 'Compara el orden de lectura, tablas y firmas con el PDF antes de reenviarlo.', fallback: 'Si no puedes seleccionar texto, el PDF puede ser un escaneo: reconoce primero su texto con OCR.' },
    en: { title: 'Edit a digital contract', input: 'A four-page PDF in which you can select a sentence with the cursor.', result: 'An editable DOCX with breaks between original pages; its layout may be simplified.', verify: 'Compare reading order, tables and signatures with the PDF before sending it.', fallback: 'If you cannot select text, the PDF may be a scan: recognize its text with OCR first.' }
  },
  'word-a-pdf': {
    es: { title: 'Compartir un documento terminado', input: 'Una carta DOCX con una tabla que quieres compartir como PDF.', result: 'Una vista HTML imprimible; eliges «Guardar como PDF» en el diálogo de impresión del navegador.', verify: 'Compara saltos de página, tablas, encabezados y firmas con el Word original.', fallback: 'Si necesitas una reproducción exacta, exporta el PDF desde el editor original.' },
    en: { title: 'Share a finished document', input: 'A DOCX letter with a table that you want others to read as a PDF.', result: 'A printable HTML view; choose “Save as PDF” in your browser’s print dialog.', verify: 'Compare page breaks, tables, headers and signatures with the Word original.', fallback: 'For an exact Word layout, export to PDF from the original editor instead.' }
  },
  'unir-pdf': {
    next: 'dividir-pdf',
    es: { title: 'Reunir una solicitud', input: 'formulario.pdf, identificacion.pdf y soportes.pdf, en el orden que quieres presentar.', result: 'Un PDF que conserva las páginas de los tres archivos, sin combinar sus textos.', verify: 'Abre el resultado y confirma que el primer documento y las páginas finales están en el orden previsto.', fallback: 'Si un PDF protegido o dañado falla, vuelve a guardarlo desde una copia que puedas abrir.' },
    en: { title: 'Assemble an application', input: 'form.pdf, identification.pdf and evidence.pdf, in the order you want to submit.', result: 'One PDF retaining the pages of all three files, without merging their text.', verify: 'Open the result and confirm that the first document and last pages are in the intended order.', fallback: 'If a protected or damaged PDF fails, save a fresh copy from a file you can open.' }
  },
  'dividir-pdf': {
    next: 'unir-pdf',
    es: { title: 'Separar tres capítulos', input: 'Un PDF de 12 páginas con rangos 1-4; 5-8; 9-12.', result: 'Un ZIP con tres PDF, cada uno con un capítulo distinto.', verify: 'Antes de ejecutar, la vista previa debe indicar tres archivos y 12 páginas seleccionadas.', fallback: 'Si los rangos se solapan o exceden el número de páginas, corrige la selección; dividir por partes equilibra páginas, no megabytes.' },
    en: { title: 'Separate three chapters', input: 'A 12-page PDF with ranges 1-4; 5-8; 9-12.', result: 'A ZIP containing three PDFs, one for each chapter.', verify: 'Before running, the preview should show three files and 12 selected pages.', fallback: 'Correct overlapping or out-of-range selections; splitting by parts balances pages, not file size.' }
  },
  'comprimir-pdf': {
    next: 'dividir-pdf',
    es: { title: 'Revisar el peso de un PDF', input: 'Un informe digital con texto seleccionable exportado desde un editor.', result: 'Una copia con su estructura interna reescrita; el tamaño podría bajar o permanecer igual.', verify: 'Compara bytes y número de páginas con el original, y abre varias páginas del resultado.', fallback: 'Si el peso procede de fotografías, esta operación no reduce su resolución; separa páginas si solo necesitas enviar una parte.' },
    en: { title: 'Check a PDF’s file size', input: 'A digital report with selectable text exported from an editor.', result: 'A copy with its internal structure rewritten; its size may decrease or stay the same.', verify: 'Compare bytes and page count with the original, then open several output pages.', fallback: 'If photographs dominate the size, this does not lower their resolution; split pages if you only need to send part of the file.' }
  },
  'imagen-a-texto': {
    es: { title: 'Transcribir un recibo fotografiado', input: 'Una foto nítida de un recibo en español, tomada de frente y sin reflejos.', result: 'Texto reconocible y copiable; no reproduce la estructura visual del recibo.', verify: 'Revisa cantidades, fechas y números de referencia contra la foto.', fallback: 'Si hay letras confusas, mejora luz y enfoque; el primer uso puede tardar mientras se descargan los datos de idioma.' },
    en: { title: 'Transcribe a photographed receipt', input: 'A sharp, glare-free photo of an English receipt taken straight on.', result: 'Recognized, copyable text; the receipt’s visual layout is not recreated.', verify: 'Check amounts, dates and reference numbers against the photo.', fallback: 'If letters are unclear, improve lighting and focus; the first run may take longer while language data downloads.' }
  },
  'eliminar-metadatos-imagen': {
    next: 'ver-metadatos-exif',
    es: { title: 'Compartir una foto sin ubicación incrustada', input: 'Una foto JPG con datos GPS y de cámara dentro del archivo.', result: 'Una copia recodificada que descarta los metadatos EXIF habituales.', verify: 'Descarga la copia y consulta sus metadatos antes de enviarla; conserva el original aparte.', fallback: 'Una dirección, matrícula o rostro visible seguirá en la imagen; revisa también el nombre del archivo.' },
    en: { title: 'Share a photo without embedded location', input: 'A JPG photo containing GPS coordinates and camera details in its metadata.', result: 'A re-encoded copy that discards common EXIF metadata.', verify: 'Download the copy and inspect its metadata before sharing; keep the original separately.', fallback: 'A visible address, license plate or face remains in the image; review the filename too.' }
  },
  'collage-de-fotos': {
    es: { title: 'Comparar cuatro fotografías', input: 'Cuatro fotos de un proyecto, con los sujetos cerca del centro.', result: 'Una composición cuadrada en cuadrícula automática con fondo elegido.', verify: 'Comprueba que ninguna cara, etiqueta o detalle importante haya quedado fuera de su celda.', fallback: 'El recorte de las celdas es automático; usa fotografías con margen alrededor del sujeto si se cortan los bordes.' },
    en: { title: 'Compare four photographs', input: 'Four project photos with their subjects near the center.', result: 'A square composition in an automatic grid with your chosen background.', verify: 'Check that no face, label or important detail was cropped from a cell.', fallback: 'Cell cropping is automatic; choose photos with space around the subject if edges are cut.' }
  },
  'formatear-html': {
    es: { title: 'Leer una plantilla compactada', input: 'Un fragmento como <main><h1>Informe</h1><p>Resumen</p></main>.', result: 'El mismo código con saltos de línea y sangría para revisar su estructura.', verify: 'Comprueba etiquetas anidadas y atributos después de copiar la salida; el formateador no muestra una vista del sitio.', fallback: 'Si el código no se puede analizar, corrige la sintaxis de entrada; formatear no prueba accesibilidad ni ejecuta scripts.' },
    en: { title: 'Read a compact template', input: 'A snippet such as <main><h1>Report</h1><p>Summary</p></main>.', result: 'The same code with line breaks and indentation for structural review.', verify: 'Check nested tags and attributes after copying the output; the formatter does not preview the site.', fallback: 'If parsing fails, fix the input syntax; formatting does not test accessibility or execute scripts.' }
  },
  'formatear-javascript': {
    es: { title: 'Revisar una función compactada', input: 'Un fragmento compacto: const total=[2,3].reduce((a,b)=>a+b,0);', result: 'Código reorganizado por Prettier con la sangría y comillas elegidas.', verify: 'Ejecuta tus propias pruebas tras reemplazar el código: el formateador no comprueba su lógica.', fallback: 'Si aparece un error de análisis, revisa llaves y paréntesis; el código no se ejecuta aquí.' },
    en: { title: 'Review a compact function', input: 'A compact snippet: const total=[2,3].reduce((a,b)=>a+b,0);', result: 'Code arranged by Prettier with your selected indentation and quotes.', verify: 'Run your own tests after replacing code; the formatter does not check its logic.', fallback: 'If parsing fails, check braces and parentheses; the code is not executed here.' }
  },
  'generador-citas-apa-vancouver': {
    es: { title: 'Preparar una referencia de libro', input: 'Datos ficticios: García, A.; 2024; Manual de estudio; Editorial Ejemplo.', result: 'Un borrador en APA 7, Vancouver o MLA 9 a partir de los campos introducidos.', verify: 'Contrasta autor, edición, puntuación y DOI con la fuente y el manual del estilo requerido.', fallback: 'En Vancouver debes numerar las referencias según su orden de aparición; el generador no conoce tu texto.' },
    en: { title: 'Draft a book reference', input: 'Fictional data: Smith, J.; 2024; Study handbook; Example Press.', result: 'An APA 7, Vancouver or MLA 9 draft from the fields you enter.', verify: 'Check author, edition, punctuation and DOI against the source and required style manual.', fallback: 'For Vancouver, number entries in citation order yourself; the generator does not know your manuscript.' }
  },
  'comprimir-imagen': {
    next: 'redimensionar-imagen',
    es: { title: 'Preparar una foto para enviar', input: 'Una fotografía PNG de 2400 × 1600 píxeles; eliges WebP con calidad 78.', result: 'Una copia WebP con las mismas dimensiones, si el navegador admite ese formato.', verify: 'Compara peso y aspecto visual con el original; una calidad 78 no significa 78 % menos bytes.', fallback: 'Si sigue pesando mucho, reduce también los píxeles con Redimensionar imagen.' },
    en: { title: 'Prepare a photo to send', input: 'A 2400 × 1600 PNG photograph; choose WebP at quality 78.', result: 'A WebP copy at the same dimensions if your browser supports that format.', verify: 'Compare file size and visual quality with the original; quality 78 does not mean 78% fewer bytes.', fallback: 'If it is still too large, reduce pixel dimensions with Resize Image too.' }
  },
  'redimensionar-imagen': {
    next: 'comprimir-imagen',
    es: { title: 'Adaptar una foto a un formulario', input: 'Una foto de 4000 × 3000 píxeles; ancho objetivo de 1200 con proporción conservada.', result: 'Una imagen de 1200 × 900 píxeles, sin estirar al sujeto.', verify: 'Comprueba las dimensiones descargadas y el encuadre antes de subirla al formulario.', fallback: 'Si aún excede el límite en MB, comprímela después; agrandar una imagen pequeña no añade detalle.' },
    en: { title: 'Fit a photo for a form', input: 'A 4000 × 3000 photo; target width 1200 with aspect ratio preserved.', result: 'A 1200 × 900 image without stretching the subject.', verify: 'Check the downloaded dimensions and framing before uploading it to the form.', fallback: 'If it still exceeds the MB limit, compress it next; enlarging a small photo will not add detail.' }
  },
  'quitar-fondo-imagen': {
    es: { title: 'Aislar un producto', input: 'Una foto JPG de un producto bien iluminado y contrastado con el fondo.', result: 'Un PNG con transparencia estimada por el modelo local.', verify: 'Amplía la vista y revisa bordes, huecos internos y sombras antes de publicarlo.', fallback: 'Cabello, cristal y fondos del mismo color pueden fallar; prueba una imagen de mayor contraste.' },
    en: { title: 'Isolate a product', input: 'A well-lit JPG product photo with clear contrast against its background.', result: 'A PNG with transparency estimated by the local model.', verify: 'Zoom in and inspect edges, internal gaps and shadows before publishing.', fallback: 'Hair, glass and similar-colored backgrounds may fail; try a higher-contrast image.' }
  },
  'convertir-archivos-csv-excel-json': {
    next: 'auditar-archivo-csv',
    es: { title: 'Llevar ventas a una hoja', input: 'ventas.csv con cabeceras fecha,producto,total y una fila por venta.', result: 'Un XLSX o JSON con columnas derivadas de la primera fila; no crea fórmulas ni gráficos.', verify: 'Comprueba separadores, cabeceras y ceros iniciales en códigos al abrir el destino.', fallback: 'Si hay columnas desplazadas o duplicados, inspecciona el CSV antes de convertirlo.' },
    en: { title: 'Move sales into a sheet', input: 'sales.csv with date,product,total headers and one row per sale.', result: 'An XLSX or JSON using the first row as headers; no formulas or charts are created.', verify: 'Check separators, headers and leading zeros in identifiers after opening the output.', fallback: 'If columns shift or rows repeat, inspect the CSV before converting it.' }
  },
  'auditar-archivo-csv': {
    next: 'convertir-archivos-csv-excel-json',
    es: { title: 'Detectar problemas antes de importar', input: 'Un CSV de contactos con filas repetidas y algunas celdas de correo vacías.', result: 'Un informe de columnas, vacíos, duplicados y tipos probables; el archivo original no se corrige.', verify: 'Confirma el separador detectado y compara los recuentos con una muestra de filas.', fallback: 'Si todas las columnas aparecen juntas, selecciona el separador correcto y repite el análisis.' },
    en: { title: 'Find issues before importing', input: 'A contacts CSV with repeated rows and some empty email cells.', result: 'A report of columns, missing values, duplicates and probable types; the input is not changed.', verify: 'Confirm the detected delimiter and compare counts with a sample of rows.', fallback: 'If every column appears together, select the correct delimiter and run the audit again.' }
  },
  'extraer-texto-pdf': {
    next: 'imagen-a-texto',
    es: { title: 'Copiar notas de un informe', input: 'Un PDF digital de dos columnas cuyo texto se puede seleccionar.', result: 'Texto para copiar o guardar; el diseño de columnas puede perderse.', verify: 'Compara el orden de los párrafos y caracteres especiales con la página original.', fallback: 'Si el archivo contiene solo páginas fotografiadas, usa OCR: extraer la capa de texto no leerá la imagen.' },
    en: { title: 'Copy notes from a report', input: 'A two-column digital PDF with selectable text.', result: 'Text you can copy or save; column layout may be lost.', verify: 'Compare paragraph order and special characters with the original page.', fallback: 'If the pages are photographs, use OCR: extracting the text layer cannot read the image.' }
  },
  'jpg-a-pdf': {
    next: 'unir-pdf',
    es: { title: 'Enviar dos recibos juntos', input: 'Dos fotos JPG legibles de recibos, elegidas en el orden de presentación.', result: 'Un PDF con una página para cada foto, ajustada al tamaño de página elegido.', verify: 'Abre ambas páginas y revisa orientación, bordes y legibilidad de los importes.', fallback: 'Si la foto está borrosa, convertirla a PDF no recupera detalles; vuelve a fotografiarla.' },
    en: { title: 'Send two receipts together', input: 'Two readable JPG receipt photos selected in submission order.', result: 'A PDF with one fitted page per photo at your chosen page size.', verify: 'Open both pages and inspect orientation, edges and readability of amounts.', fallback: 'A blurry photo will not become clearer in PDF; photograph it again.' }
  },
  'recortar-imagen': {
    next: 'redimensionar-imagen',
    es: { title: 'Recortar el centro de una foto', input: 'Una imagen de 1600 × 1200; conservas 75 % del ancho y 80 % del alto.', result: 'Un recorte centrado de 1200 × 960 píxeles descargado como imagen nueva.', verify: 'Comprueba que el sujeto permanezca dentro de los bordes antes de compartir.', fallback: 'Esta versión no mueve el foco de recorte: si el sujeto está a un lado, prepara otra foto o usa un editor manual.' },
    en: { title: 'Crop the center of a photo', input: 'A 1600 × 1200 image; keep 75% of the width and 80% of the height.', result: 'A centered 1200 × 960 crop downloaded as a new image.', verify: 'Make sure the subject remains inside the edges before sharing.', fallback: 'This version cannot move the crop focus; use another source photo or a manual editor for off-center subjects.' }
  }
};

const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function priorityExampleHero(slug, language) {
  const item = priorityExamples[slug]?.[language];
  if (!item) return '';
  const en = language === 'en';
  return '<aside class="seo-example" aria-label="' + (en ? 'Practical example' : 'Ejemplo práctico') + '">' +
    '<span class="seo-section-label">' + (en ? 'A PRACTICAL EXAMPLE' : 'EJEMPLO PRÁCTICO') + '</span>' +
    '<h2>' + esc(item.title) + '</h2>' +
    '<dl><div><dt>' + (en ? 'Starting point' : 'Punto de partida') + '</dt><dd>' + esc(item.input) + '</dd></div>' +
    '<div><dt>' + (en ? 'What you get' : 'Qué obtienes') + '</dt><dd>' + esc(item.result) + '</dd></div></dl>' +
    '</aside>';
}

export function priorityExampleReview(slug, language, nextPage) {
  const item = priorityExamples[slug]?.[language];
  if (!item) return '';
  const en = language === 'en';
  const next = nextPage ? '<a class="seo-inline-link" href="' + esc(nextPage.href) + '">' +
    (en ? 'Useful next step: ' : 'Siguiente paso útil: ') + esc(nextPage.h1) + ' ↗</a>' : '';
  return '<section class="seo-example-review" aria-labelledby="example-review-title"><div class="seo-section-label">' +
    (en ? 'BEFORE YOU USE THE RESULT' : 'ANTES DE USAR EL RESULTADO') + '</div><h2 id="example-review-title">' +
    (en ? 'Check this output' : 'Comprueba el resultado') + '</h2><div class="seo-example-review-grid">' +
    '<div><strong>' + (en ? 'Check' : 'Revisa') + '</strong><p>' + esc(item.verify) + '</p></div>' +
    '<div><strong>' + (en ? 'If it does not work' : 'Si no sale bien') + '</strong><p>' + esc(item.fallback) + '</p></div></div>' + next + '</section>';
}
