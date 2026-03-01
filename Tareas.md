# Tareas Pendientes - Stocker

## 1. Refactorización de Análisis de Tenencia (Base de Datos)

**Objetivo:** Migrar el cálculo de tenencias por ALyC e instrumento desde el frontend (JavaScript) a una Vista SQL en Supabase para mejorar el rendimiento y la escalabilidad.

### SQL para crear la Vista en Supabase:
```sql
CREATE OR REPLACE VIEW v_holdings_by_alyc AS
SELECT 
  o.user_id,
  a.name AS alyc_name,
  a.id AS alyc_id,
  i.ticker,
  i.name AS instrument_name,
  o.currency,
  SUM(CASE WHEN o.type = 'compra' THEN o.quantity ELSE -o.quantity END) AS total_quantity,
  MAX(o.price) FILTER (WHERE o.operated_at = (
    SELECT MAX(operated_at) 
    FROM operations 
    WHERE instrument_id = o.instrument_id AND user_id = o.user_id
  )) as last_price
FROM operations o
JOIN instruments i ON o.instrument_id = i.id
JOIN alycs a ON o.alyc_id = a.id
GROUP BY o.user_id, a.name, a.id, i.ticker, i.name, o.currency
HAVING SUM(CASE WHEN o.type = 'compra' THEN o.quantity ELSE -o.quantity END) > 0.000001;
```

### Beneficios:
- **Rendimiento:** El motor de la base de datos procesa los cálculos de forma óptima.
- **Eficiencia de Red:** Solo se descargan los resultados finales, no todo el historial.
- **Simplicidad:** Reduce la complejidad del archivo `holdings-analysis.js`.
- **Mantenibilidad:** La lógica de negocio queda centralizada en el backend.

### Pasos a seguir:
1. Ejecutar el SQL anterior en el Editor de SQL de Supabase.
2. Habilitar RLS (Row Level Security) para la vista o asegurar que los permisos sean correctos.
3. Modificar `_calculateHoldingsByAlyc()` en `public/js/pages/holdings-analysis.js` para que haga un `select` directamente sobre `v_holdings_by_alyc`.
