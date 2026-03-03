-- ============================================================
-- ÍNDICES DE RENDIMIENTO (PERFORMANCE)
-- Optimización de consultas frecuentes y reportes
-- ============================================================

-- 1. Optimización para Historial de Operaciones (Paginación + Orden)
-- Este índice permite que la consulta por usuario y fecha sea instantánea.
CREATE INDEX IF NOT EXISTS idx_operations_user_date 
ON operations(user_id, operated_at DESC);

-- 2. Optimización para Análisis de Tenencia (Agregación)
-- Cubre los filtros más comunes usados para agrupar operaciones por ALyC e instrumento.
CREATE INDEX IF NOT EXISTS idx_operations_user_alyc_inst 
ON operations(user_id, alyc_id, instrument_id);

-- 3. Optimización para Búsqueda de Instrumentos (Ticker + Nombre)
-- Acelera las búsquedas por texto en la vista operations_search.
CREATE INDEX IF NOT EXISTS idx_instruments_search 
ON instruments(user_id, ticker, name);

-- 4. Optimización para Tipos de Instrumentos
CREATE INDEX IF NOT EXISTS idx_instrument_types_user_name 
ON instrument_types(user_id, name);

ANALYZE operations;
ANALYZE instruments;
ANALYZE alycs;
