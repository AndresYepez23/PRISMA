# Prisma Space — continuidad SEO para Codex sin contexto (15-11-2026)

**Lee esta nota primero.** Es una transferencia operativa, no una invitación a auditar de nuevo todo el repositorio. Proyecto: `AndresYepez23/PRISMA`; web: https://prismaspace.space. Objetivo del propietario: **mejorar clics/posicionamiento de las páginas actuales y expandir hasta aproximadamente 50 nuevas páginas por idioma SOLO donde exista intención de búsqueda diferenciada, utilidad real y capacidad demostrable de atraer usuarios**. No rellenar cuotas con páginas de baja calidad.

## Actualización de ejecución — 15-11-2026
- **#154 ya fusionado** como `c4362a8f42c52d57ed70dd5a5e6206d06c7a62d3`; Cloudflare y el manifiesto del dominio principal confirmaron ese commit y 372 URL (186 ES / 186 EN).
- La rama `feat/seo-continuity-completion`, creada desde ese `main`, añade las **16 candidatas viables restantes**: lectura, JSON, HTML a Markdown y CSV/TSV en ambos idiomas; UTF-8 CSV y extracción/OCR PDF en ambos idiomas; ceros iniciales y PDF con imágenes en ES; formularios PDF y rechazo de cargas en EN.
- Sitemap generado: **388 URL (194 ES / 194 EN)**. Son **24 nuevas respecto a la base de 364**, de las 28 candidatas estudiadas. El artículo ES de ceros iniciales es equivalente real del EN ya publicado y ambos tienen enlaces recíprocos.
- Se completaron controles de texto/ritmo, HTML pegado y conversión CSV/TSV bidireccional; las celdas entrecomilladas, saltos internos y ceros se conservan. El HTML usa contenido inerte sin descargar recursos. Los demás motores y la infraestructura conservan su estado.
- Validación de este lote: **171 comprobaciones de build y 48 casos Chromium aprobados**, incluidos controles bilingües y resultados reales de los motores modificados. El CI habitual conserva estas verificaciones antes de fusionar.
- Quedan **4 reservas**: límite de KB, contacto PDF y JSON/XML ES/EN. Las otras **72 oportunidades** de la meta aproximada siguen pendientes de investigación/evidencia; no hay métricas de GSC corroboradas. No generar páginas para completar una cuota.
- Para retomar, comprobar primero el PR y el despliegue de esta rama; las instrucciones y conteos originales de las secciones siguientes son el checkpoint histórico, no trabajo que deba repetirse.

## 0. Punto de control verificable (revisar estado remoto antes de ejecutar)
- `main` al escribir esta nota: `587760c51606548f17b66d62d38a7e25904a7486`, tras PR #129 (i18n y preparación de AdSense).
- **PR #154**: https://github.com/AndresYepez23/PRISMA/pull/154; rama **`feat/seo-first-expansion`**, HEAD al inicio `9080e1180fbd41d8e31a4a993cf5c04f87162e13`. **Abierto, no fusionado** en la comprobación del 15-11-2026. Aun si este archivo genera otro commit, no perder trabajo posterior.
- PR #154 ya implementó **8 páginas** (4 ES, 4 EN) + optimizaciones de fichas existentes. Base anterior: **364 URL** (182 ES y 182 EN); con #154: **372 URL** (186 ES y 186 EN). Corrigió `flashcards-export` para no crear tarjeta ficticia `Front,Back`; ajustó contenido real de dividir PDF, OCR inglés, CSV, PDF a Word, compresión, SRT y otras fichas; admitió páginas regionales exclusivas sin `hreflang` falso.
- Pruebas ya ejecutadas en #154: **168 validaciones de build**, **31 casos Chromium**, CI run **43722483524**, job **132837255140** aprobado; previews Cloudflare comunicados como exitosos. No dar por fusionado/publicado en dominio principal hasta comprobarlo.
- **No repitas** esos tests ni releas archivos masivamente si no hubo cambios materiales. Confirma remotamente HEAD, estado de #154, CI y vista previa, resuelve solo fallos nuevos, **fusiona #154 si es seguro y las comprobaciones siguen verdes**, confirma producción; si está fusionado, sigue desde el nuevo `main`. No reimplementes sus 8 páginas.
- Otros PR #140/#143/#144 son históricos de Qwen/proveedores: **NO** incorporarlos en esta misión. Qwen se cerró en #153 y no se toca.

## 1. Lo que investigó Work (no repetir)
Work inspeccionó inventarios `prisma/seo/pages.json`, `prisma/seo/pages.en.json`, generadores y motores, y propuso **28 candidatas sustentadas editorial/técnicamente (14 por idioma)**, de las cuales **8 ya están en #154**. No encontró conexión ni sesión accesible de **Google Search Console**; por tanto **NO existen datos corroborados de impresiones, clics, CTR, posición, volumen, competencia cuantificada o demanda por país** en esa investigación. No inventes esas cifras, ni afirmes canibalización sin datos consulta–URL.

Hallazgos ya abordados por #154: dividir PDF soporta múltiples modos y un grupo da PDF frente a varios grupos ZIP; título inglés de OCR estaba orientado erróneamente a español; PDF a Word debe distinguir digital y escaneado; compresión PDF no garantiza peso final; texto SEO genérico. Comprobar contra código antes de cualquier mejora adicional, sin modificar lo que ya funciona.

### Las 8 candidatas YA HECHAS en #154 (no duplicar)
- ES: `/herramientas/crear-tarjetas-anki/`; `/herramientas/comparar-textos/`; `/guias/csv-una-sola-columna-excel/`; `/guias/preparar-documentos-simo/`.
- EN: `/en/tools/anki-csv-maker/`; `/en/tools/text-difference-checker/`; `/en/guides/keep-leading-zeros-csv-excel/`; `/en/solutions/combine-documents-one-upload/`.
- ES+EN Anki y comparación son parejas reales. SIMO, CSV una columna, ceros iniciales y carga única son páginas sin pareja idiomática equivalente: **nunca les inventes una**.

### 20 candidatas RESTANTES del estudio previo: implementar solo cuando la función o guía sea real
**ES**
1. `/herramientas/tiempo-de-lectura/`: requiere campos de texto y palabras/minuto en `reading-time-local`.
2. `/herramientas/formatear-json/`: motor `json-format` existente; ejemplo de JSON válido/inválido; competencia alta.
3. `/herramientas/html-a-markdown/`: ajustar campos de entrada y límites del motor; nada de scrapeo de páginas completas.
4. `/herramientas/convertir-csv-tsv/`: controlar separadores, comillas y saltos internos; una sola URL bidireccional.
5. `/guias/acentos-caracteres-csv-excel/`: guía de UTF-8/BOM y errores de codificación.
6. `/guias/conservar-ceros-csv-excel/`: guía identificadores y texto.
7. `/guias/no-puedo-copiar-texto-pdf/`: diagnóstico digital/escaneado/restringido y OCR.
8. `/soluciones/unir-pdf-e-imagenes/`: imágenes a PDF y luego unir; pasos reales.
9. `/herramientas/imagen-limite-kb/`: **RESERVA**; requiere control de peso objetivo y verificación real, sin garantizar todos los límites.
10. `/herramientas/convertir-json-xml/`: **RESERVA**; resolver o explicar pérdida de atributos y contenido mixto.

**EN**
1. `/en/tools/reading-time-calculator/`: requiere controles de texto y ritmo.
2. `/en/tools/json-formatter/`: motor existente, errores legibles.
3. `/en/tools/html-to-markdown/`: ajustar entrada y límites.
4. `/en/tools/csv-tsv-converter/`: controles y CSV robusto.
5. `/en/guides/csv-utf8-excel/`: guía de codificación y BOM.
6. `/en/guides/cannot-copy-text-from-pdf/`: escaneado/digital/restringido.
7. `/en/guides/filled-pdf-appears-blank/`: campos de formularios y aplanar copia, conservar original.
8. `/en/guides/document-upload-rejected/`: validación de extensión/formato/peso, no garantizar aceptación.
9. `/en/tools/pdf-contact-sheet/`: **RESERVA**, necesita nueva maquetación multipágina con etiquetas.
10. `/en/tools/json-xml-converter/`: **RESERVA**, requiere evitar/promover pérdidas.

Una pareja `ES/EN` solo si contenido e intención son realmente equivalentes; páginas regionales independientes sin `hreflang` entre ellas. No producir traducciones de relleno solo para igualar conteos.

## 2. Ejecución: ahorrar créditos, avanzar de verdad
1. **Primero cerrar #154**, no rehacerlo. Si está abierto y el CI pasó, última comprobación mínima de estado + merge seguro. Si no se puede, explica bloqueo concreto y conserva el PR intacto.
2. **Después** nueva rama aislada desde el `main` actualizado (no mezclar con ramas Qwen). Implementar en tandas priorizadas **sin replantear la arquitectura**, reutilizando `prisma/seo/expansion-pages.json`, `prisma/seo/generate-expansion.mjs`, `prisma/seo/generate-international.mjs` y los motores existentes. No duplicar generadores ni rutas.
3. Prioridad inmediata entre las candidatas pendientes: fichas con motor completo (JSON formatter ES/EN), guías útiles de CSV UTF-8/ceros/PDF escaneado y casos reales regionales. Completar controles antes de fichas de herramienta donde haga falta. Reservas con funcionalidad incompleta **no se publican**.
4. **Mejora adicional de páginas existentes solo con causa concreta** (error, intención equivocada, contenido inexacto, enlaces insuficientes, títulos duplicados); conservar slugs y URL canónicas. No inventar promesas de funciones.
5. La **meta aproximada de 100 nuevas páginas** no obliga a generar las otras **72** sin investigación suficiente. Para acercarse a ella, descubrir progresivamente oportunidades **no duplicadas** con herramienta/guía funcional y evidencia verificable; comprobar demanda con GSC si está accesible sin nuevos inicios de sesión. Si no hay acceso, no reintentar conectores ni simular métricas: implementar solo candidatas sustentadas y marcar el resto como pendiente por evidencia. No declarar “100 completadas” si no se publicaron.
6. Control de gasto: **sin auditoría general, sin documentación extensa, sin una búsqueda web por página, sin re-verificar todos los proveedores, sin pruebas manuales duplicadas por cada URL**. Usar validaciones automatizadas masivas del build y pruebas funcionales dirigidas solo a motores modificados. Máximo una verificación exploratoria por problema reproducible. No volver a investigar las 28 candidatas. Hacer commits/PR coherentes por lote, preferir cambios pequeños y medibles.
7. Puede hacer entregas de lotes adicionales con PR separado y pruebas suficientes; no detenerse después de escribir un plan. **Priorizar cambios implementados y comprobados**. Si presupuesto/tiempo se agota, dejar código y PR en estado verificable, anotar exactamente páginas publicadas y pendientes y detenerse sin vueltas.

## 3. Reglas inviolables
- Intactos: **Prisma Core, Qwen, proveedores, fallback, autenticación, Cloudflare, D1, Supabase, 55 variables y secretos**, funciones ajenas al alcance, preparación AdSense, estética Aurora y rutas ya indexadas.
- ES URL explícita en español; EN bajo `/en/` en inglés. Preferencia/navegador solo en rutas neutrales, sin redirecciones por IP ni forzadas a robots. HTML inicial correcto, canonical propio; `hreflang` solo entre versiones reales y recíprocas; sitemap solo URLs indexables y publicadas.
- Cada página debe aportar: intención independiente, ejemplo verificable, operación real o solución documentada, límites honestos, enlaces internos útiles, metadatos únicos y FAQs no repetitivas.
- Guías de trámites/portales (SIMO/CNSC, IRCC, etc.): referenciar fuente oficial, exigir que el usuario revise su convocatoria/campo, sin inventar límites universales. Work vio errores 503 en algunas fuentes, no afirmar comprobación exitosa donde no ocurrió.
- No hacer cambios en infraestructura ni credenciales; no hacer escrituras de configuración de Cloudflare. Pruebas y despliegue vía flujo existente con protecciones habituales.

## 4. Criterios de cierre y reporte
- #154 fusionado y producción comprobada, o bloqueo real señalado.
- Mejoras ya existentes conservadas y validaciones de i18n/SEO siguen pasando.
- Candidatas adicionales **que realmente superen las pruebas** publicadas por PR posterior, si procede; nunca publicar página ligada a motor defectuoso o inexistente.
- Informe final en **máximo 10 líneas**: PR/commits, cantidad ES/EN antes/después, pruebas, URLs nuevas, despliegue confirmado, bloqueos y pendientes basados en evidencia. **No pedir más tiempo ni ofrecer auditorías futuras.**

### Comando humano para un Codex nuevo
> Lee `prisma/docs/SEO-CONTINUIDAD-CODEX-2026-11-15.md` en `AndresYepez23/PRISMA`, rama `feat/seo-first-expansion`. No tienes contexto previo: esta nota es el checkpoint. Verifica el estado remoto y ejecuta la continuidad allí definida con máxima economía de créditos. No repitas investigación ni trabajo ya concluido: empieza por cerrar PR #154 y avanza con las candidatas restantes viables.
