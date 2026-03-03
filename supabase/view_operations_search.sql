-- ============================================================
-- VISTA PARA BÚSQUEDA DE OPERACIONES
-- Une las tablas de operaciones, instrumentos y ALyCs
-- ============================================================

CREATE OR REPLACE VIEW operations_search AS
SELECT 
    o.id,
    o.type,
    o.quantity,
    o.price,
    o.currency,
    o.operated_at,
    o.notes,
    o.user_id,
    o.instrument_id,
    o.alyc_id,
    i.ticker AS instrument_ticker,
    i.name AS instrument_name,
    a.name AS alyc_name
FROM operations o
LEFT JOIN instruments i ON o.instrument_id = i.id
LEFT JOIN alycs a ON o.alyc_id = a.id;

-- Habilitar security_invoker para que la vista respete el RLS (Row Level Security)
-- de las tablas subyacentes basándose en el usuario que ejecuta la consulta.
ALTER VIEW operations_search SET (security_invoker = true);
