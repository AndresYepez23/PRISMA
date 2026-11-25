# Auditoría de seguridad — Prisma Space

Base revisada: `91ff5733c1cb810c5ca8245b7f2ba516089db1ab`. Fecha: 2026-11-23 UTC.
Alcance: rutas de investigación, AI y Core; permisos y políticas de las tres tablas; Auth,
HTML/Markdown/documentos; configuración de despliegue y búsqueda de credenciales en Git.
No se modificó producción, no se crearon usuarios, no se hicieron inferencias reales,
escaneos agresivos ni pruebas destructivas remotas. No se utilizaron Codespaces.

## Hallazgos y evidencia

| Estado | Riesgo | Hallazgo y explotación comprobada |
| --- | --- | --- |
| Confirmado | Alto, condicionado a acceso SQL/RPC | `authenticated` tiene `TRUNCATE`, `TRIGGER`, `REFERENCES` en `core_conversations`, `prisma_conversations`, `prisma_profiles`. `TRUNCATE` no respeta RLS: demostrado únicamente con datos sintéticos locales. No se encontró una función pública `SECURITY DEFINER` ni una función pública cuyo cuerpo contenga `TRUNCATE`; no se demostró una vía de explotación por REST. |
| Confirmado en código/configuración | Alto | Investigación consume Tavily/Jina sin cuota propia; `Origin` es falsificable por clientes fuera del navegador y no autentica usuarios. La zona no tiene reglas `http_ratelimit` en Rulesets. Los límites administrados de DDoS/WAF no equivalen a un presupuesto de proveedores. No se consumieron proveedores para demostrar abuso remoto. |
| Confirmado | Alto | SheetJS `xlsx@0.18.5` lee archivos no confiables en `engines.js`; versión afectada por [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), contaminación de prototipos. Dependencia y ruta de lectura confirmadas; no se demostró robo de sesión ni explotación en producción. Actualizada a la distribución oficial 0.20.3. |
| Confirmado | Medio | Investigación leía el cuerpo completo antes de comprobar tamaño, aceptaba tipos JSON incorrectos y devolvía `detail` del proveedor. Reproducido localmente; la fuga de una credencial real es potencial, no observada. |
| Confirmado | Medio | Asesor Supabase: contraseñas filtradas deshabilitado. Organización Free; la función requiere Pro o superior según documentación vigente. |
| Confirmado en repositorio | Medio | `_headers` carecía de CSP y protección de framing. Se añade una CSP parcial: `base-uri 'self'; frame-ancestors 'self'` y SAMEORIGIN. Esto no es una CSP completa contra XSS. Cabeceras finales de la aplicación no verificadas desde esta red por bloqueo 1010. |
| Potencial | Alto si se configura mal | `/api/auth/config` aceptaba cualquier JWT con prefijo `eyJ`, incluyendo service-role si se colocara por error en la variable pública. Se restringe a claves publishable o JWT con `role=anon`. No se observó una clave privada expuesta. La decodificación aquí clasifica la clave; no autentica sesiones. |
| Descartado en pruebas acotadas | — | No se reprodujo acceso entre propietarios en la réplica local de las políticas inspeccionadas. Las tres tablas tienen RLS y políticas SELECT/INSERT/UPDATE/DELETE por `auth.uid()`, con WITH CHECK en escritura; `anon` no tiene privilegios. |
| Descartado para el corpus probado | — | El saneador HTML existente elimina scripts, atributos de eventos, SVG/MathML, formularios y esquemas peligrosos. Markdown escapa HTML y usa `noopener noreferrer`. Se conserva el saneador y se añaden pruebas en Chromium. No implica ausencia de todo XSS. |

## Correcciones preparadas

- Migración manual en `sql/migrations/20261123162351_revoke_non_dml_authenticated.sql`: revoca únicamente los tres privilegios sobrantes; conserva DML, políticas, datos y service-role. Aborta si sobreviven privilegios heredados. **No aplicada**; no pertenece a las migraciones D1.
- Limitador D1 atómico de investigación: 6 intentos/minuto/IP, 40/día/IP y 200/día global; el presupuesto global admite `PRISMA_RESEARCH_DAILY_LIMIT` entre 1 y 1000. Cuenta intentos fallidos; 429 con Retry-After y 503 si D1 falta/falla. Una solicitud puede intentar Tavily y Jina; no es un presupuesto monetario exacto.
- Guardia antes del puente y en el endpoint local, con contadores separados para no cargar dos veces el mismo contador al actualizar el backend. No usa X-Forwarded-For; toma CF-Connecting-IP del borde. Redes compartidas pueden compartir cuota; revisar métricas legítimas antes de promover.
- Lectura de investigación limitada a 12.000 bytes, validación de tipos, eliminación de detalles internos y protección de configuración pública Auth.
- SheetJS 0.20.3 en lectura, exportación y verificador; se mantiene la conversión XLSX → JSON con celdas exactas en Chromium.
- Regresiones añadidas a GitHub Actions; ninguna aplica SQL o configuración remota.

## Backend estable: límite de estas correcciones

Cloudflare confirma que `17a6c338-ef6d-4cc1-8e71-44893bbec035` corresponde a
`b8a4b6ea02f2d9941cada6b6c1a5e734d4fad887`, creado el 2026-11-14.
Su código de investigación tampoco tiene limitador. El middleware actual sigue enviando
APIs allí; Qwen usa el servicio separado `prisma-queen-staging.pages.dev`.
La única aplicación Access listada protege `queen.prismaspace.space`, no el destino Pages.

La guardia nueva protege tráfico que pase por el middleware actualizado; **no actualiza
ni elimina el despliegue antiguo**. Los cambios del endpoint de investigación y Auth
no se activan para tráfico delegado al código antiguo. El acceso directo y otros
despliegues antiguos permanecen como riesgo pendiente. Cuatro peticiones acotadas
(GET raíz y POST con consulta inválida, en dominio principal y estable) recibieron
403/1010: no se considera demostración de una protección universal ni de explotación.

Producción tiene binding `PRISMA_RATE_DB`; la configuración preview consultada no lo tiene.
Un preview sin ese binding responderá 503 para investigación por diseño. Validar con
D1 aislada antes de promover; no compartir contadores de producción con pruebas.
Validar también la IP observada tras subrequests Cloudflare: el límite del puente se
aplica antes del salto, mientras que el backend puede observar una IP de Worker.

## Verificaciones

- Build local: 192 comprobaciones aprobadas; suite completa final: 490 pruebas individuales aprobadas en 59 archivos. Las primeras ejecuciones SEO sin build fallaron por faltar `dist`; después del build pasaron.
- PostgreSQL local (PGlite): 72 comprobaciones de privilegios y autorización con dos usuarios sintéticos y tres tablas; SELECT/UPDATE/DELETE ajenos denegados, INSERT y reasignación ajenos denegados, CRUD propio permitido; migración idempotente y políticas intactas. Es una reproducción del esquema/políticas inspeccionados, no una prueba de sesiones reales en producción.
- SQLite local ejecuta el UPSERT real: concurrencia, cuotas de visitante/global, rollover diario, D1 ausente/fallida, rechazo antes de proveedores, intentos fallidos, ruta codificada y Retry-After.
- Chromium: corpus XSS en HTML/Markdown y conversión real XLSX → JSON. Ningún cambio al saneador existente.
- Historial Git accesible: 2.515 blobs de texto revisados por patrones de claves privadas, tokens GitHub/proveedores y JWT service-role; ninguna coincidencia. El build copia `src`/`assets` y archivos públicos, no `functions`. No se inspeccionaron valores de secretos Cloudflare.
- No se exportaron logs de producción ni registros de usuarios. Revisión de logs/PII limitada al código de logging y artefactos Git; no se certifica ausencia de información sensible en logs o respuestas no ejercitadas.

## Pendientes y acciones que requieren autorización

1. Revisar y aplicar manualmente la migración Supabase; verificar privilegios efectivos después. No requiere truncar tablas, modificar políticas ni recrear usuarios.
2. Validar un backend nuevo con bindings y D1 aislada; comprobar Auth, investigación, proveedores y Core. Después autorizar cambio del puente y restricción/retiro coordinado de los destinos antiguos. Una regla WAF sólo en el dominio principal no protege automáticamente `pages.dev`.
3. Si se autoriza pagar Pro: en [Auth → Email](https://supabase.com/dashboard/project/hyoxywiwhnhfekakhivp/auth/providers?provider=Email), activar protección de contraseñas filtradas. [Disponibilidad y remediación oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se contrató ningún plan.
4. Revisar límites reales en Auth → Rate Limits para registro, login/token y recuperación; los límites predeterminados documentados no demuestran la configuración actual. Integrar Turnstile/hCaptcha y `captchaToken` en signup, password login y reset **antes** de activar CAPTCHA en Supabase, para no bloquear usuarios. El frontend actual no envía `captchaToken`. Ver [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha) y [límites](https://supabase.com/docs/guides/auth/rate-limits). Revisar confirmación de email, redirecciones permitidas y reautenticación de cambios de contraseña.
5. Sesión persistida por supabase-js y conversaciones en almacenamiento del navegador: un XSS o script tercero comprometido podría leerlos. La CSP propuesta sólo limita base/framing; diseñar una CSP de scripts/conexiones tras inventariar CDN, anuncios y herramientas. Hay módulos externos fijados por versión, pero también importación Hugging Face sin versión; no hay lockfile integral del grafo CDN.
6. AI/Core ya tienen cuotas antes de inferencias y controles de origen; son servicios públicos, no autorización de datos personales. Quedan cuerpos de chat/media leídos completamente antes de validar tamaño, presupuesto de endpoints de métricas y validación de cuotas bajo IP distribuida. No se cambian contratos de login ni límites globales de inferencia sin pruebas específicas.

No se identificó una credencial real que requiera rotación por esta auditoría. Si se
confirma exposición en logs o en un despliegue histórico, revocar/rotar la credencial
afectada y revisar uso, sin publicar su valor. No fusionar/desplegar hasta validar los
checks y los bindings; este informe no afirma que Prisma sea invulnerable.
