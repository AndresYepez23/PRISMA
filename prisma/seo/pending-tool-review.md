# Revisión de las 12 herramientas sin ficha individual

Actualizado: 2026-11-25. Se conservan las 388 URLs del sitemap. La publicación exige intención distinta, motor ejecutable, formulario utilizable y evidencia de demanda; no se crean fichas solo para igualar el número de herramientas.

| Clasificación | Herramientas | Decisión |
| --- | --- | --- |
| Sin motor publicable | `pdf-protect`, `video-transcribe` | Mantener como planificadas. |
| Intención cubierta | `json-schema` → `json-schema-validate`; `tsv-to-csv-local` → página CSV ↔ TSV; `contrast-check-local` → `contrast` | Usar la ficha existente. |
| Formulario corregido, sin nueva ficha | `ai-webpage`, `text-summary-local`, `text-analyzer-local`, `json-to-xml-local`, `xml-to-json-local`, `text-dedupe-words-local` | Los seis formularios ya reciben sus parámetros reales. Se probaron los cinco motores locales y se verificó el acceso al generador conectado sin ejecutar llamadas de IA. Reconsiderar nuevas fichas solo si hay demanda distinta. |
| Motor y formulario disponibles, sin demanda comprobada | `image-social-kit` | Candidato para una ficha ES/EN si las consultas justifican una intención propia; no añadir dos URLs ahora. |

RLS de producción se comprobó mediante metadatos de solo lectura: `prisma_profiles` y `prisma_conversations` tienen RLS habilitado y ocho políticas de propiedad por `auth.uid()`. No se leyeron filas de usuarios ni se modificaron políticas. El asesor de seguridad de Supabase informó que la protección contra contraseñas filtradas está desactivada; requiere una decisión de configuración de Auth fuera de este PR.
