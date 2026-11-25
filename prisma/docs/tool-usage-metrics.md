# Contadores de herramientas

Se reutilizan `PRISMA_RATE_DB.core_metrics` y el endpoint de escritura `/api/core/metrics`. La ruta se resuelve en el despliegue actual: es una excepción explícita al puente de APIs antiguo porque solo usa D1 y no credenciales de proveedores. La validación de Origin se mantiene. No hay endpoint público de lectura ni cambios de esquema.

`requested`, `succeeded` y `failed` cuentan ejecuciones del motor. `download-clicked`, `copied` y `print-opened` cuentan acciones en fichas y modales; un clic no demuestra que el usuario haya guardado el archivo. `retry` cuenta reintentos explícitos de las fichas. No son usuarios únicos ni un embudo por persona. No se guardan entradas, resultados, nombres, IDs de usuario o mensajes de error. El envío omite cookies y referrer y respeta DNT/GPC.

Consulta agregada de solo lectura, en D1:

```sql
SELECT day, tool_id, event, count, duration_ms
FROM core_metrics
WHERE day >= date('now', '-7 days')
ORDER BY day DESC, tool_id, event;
```

La comprobación de producción del 25-11-2026 verificó únicamente el esquema ya existente. Las pruebas de ingestión usan una base simulada y no inflan los contadores de producción.
