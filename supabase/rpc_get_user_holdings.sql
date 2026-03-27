-- ============================================================
-- FUNCIÓN RPC: get_user_holdings
-- Calcula la tenencia actual del usuario consolidada por ALyC e Instrumento.
-- Evita descargar todo el historial de operaciones al navegador.
-- 
-- Parámetros:
--   p_limit: número máximo de tenencias a devolver (default 100)
--   p_offset: offset para paginación (default 0)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_holdings(
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    alyc_id UUID,
    alyc_name TEXT,
    instrument_id UUID,
    ticker TEXT,
    instrument_name TEXT,
    instrument_type_name TEXT,
    total_quantity NUMERIC,
    avg_buy_price NUMERIC,
    currency TEXT,
    total_rows INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH holdings AS (
        SELECT
            o.alyc_id,
            a.name AS alyc_name,
            o.instrument_id,
            i.ticker,
            i.name AS instrument_name,
            it.name AS instrument_type_name,
            SUM(CASE WHEN o.type = 'compra' THEN o.quantity ELSE -o.quantity END) AS total_quantity,
            SUM(CASE WHEN o.type = 'compra' THEN o.price * o.quantity ELSE 0 END)
              / NULLIF(SUM(CASE WHEN o.type = 'compra' THEN o.quantity ELSE 0 END), 0) AS avg_buy_price,
            o.currency
        FROM operations o
        JOIN instruments i ON o.instrument_id = i.id
        JOIN instrument_types it ON i.instrument_type_id = it.id
        JOIN alycs a ON o.alyc_id = a.id
        WHERE o.user_id = auth.uid()
        GROUP BY o.alyc_id, a.name, o.instrument_id, i.ticker, i.name, it.name, o.currency
        HAVING SUM(CASE WHEN o.type = 'compra' THEN o.quantity ELSE -o.quantity END) > 0.000001
    )
    SELECT 
        h.alyc_id,
        h.alyc_name,
        h.instrument_id,
        h.ticker,
        h.instrument_name,
        h.instrument_type_name,
        h.total_quantity,
        h.avg_buy_price,
        h.currency,
        COUNT(*) OVER()::INT AS total_rows
    FROM holdings h
    ORDER BY h.total_quantity DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Comentario informativo para la interfaz de Supabase
COMMENT ON FUNCTION get_user_holdings() IS 'Calcula la tenencia consolidada del usuario actual para la página de Análisis.';
