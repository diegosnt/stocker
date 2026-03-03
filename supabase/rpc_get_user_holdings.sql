-- ============================================================
-- FUNCIÓN RPC: get_user_holdings
-- Calcula la tenencia actual del usuario consolidada por ALyC e Instrumento.
-- Evita descargar todo el historial de operaciones al navegador.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_holdings()
RETURNS TABLE (
    alyc_id UUID,
    alyc_name TEXT,
    instrument_id UUID,
    ticker TEXT,
    instrument_name TEXT,
    total_quantity NUMERIC,
    last_price NUMERIC,
    currency TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.alyc_id,
        a.name AS alyc_name,
        o.instrument_id,
        i.ticker,
        i.name AS instrument_name,
        -- Sumamos compras y restamos ventas
        SUM(CASE WHEN o.type = 'compra' THEN o.quantity ELSE -o.quantity END) AS total_quantity,
        -- Obtenemos el último precio registrado para este instrumento por el usuario
        (
            SELECT p.price 
            FROM operations p 
            WHERE p.instrument_id = o.instrument_id 
              AND p.user_id = auth.uid() 
            ORDER BY p.operated_at DESC, p.created_at DESC 
            LIMIT 1
        ) AS last_price,
        o.currency
    FROM operations o
    JOIN instruments i ON o.instrument_id = i.id
    JOIN alycs a ON o.alyc_id = a.id
    WHERE o.user_id = auth.uid()
    GROUP BY o.alyc_id, a.name, o.instrument_id, i.ticker, i.name, o.currency
    -- Solo devolvemos instrumentos con saldo positivo (mayor a una millonésima)
    HAVING SUM(CASE WHEN o.type = 'compra' THEN o.quantity ELSE -o.quantity END) > 0.000001;
END;
$$;

-- Comentario informativo para la interfaz de Supabase
COMMENT ON FUNCTION get_user_holdings() IS 'Calcula la tenencia consolidada del usuario actual para la página de Análisis.';
