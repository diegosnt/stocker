-- ============================================================
-- FUNCIÓN RPC: get_user_holdings_global
-- Tenencia consolidada del usuario agrupada solo por instrumento
-- (sin diferenciar ALyC). Usada por el Dashboard global.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_holdings_global()
RETURNS TABLE (
    instrument_id        UUID,
    ticker               TEXT,
    instrument_name      TEXT,
    instrument_type_name TEXT,
    total_quantity       NUMERIC,
    avg_buy_price        NUMERIC,
    currency             TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.instrument_id,
        i.ticker,
        i.name                                                          AS instrument_name,
        it.name                                                         AS instrument_type_name,
        SUM(CASE WHEN o.type = 'compra' THEN o.quantity ELSE -o.quantity END) AS total_quantity,
        -- Precio promedio ponderado de compra global (todas las ALyCs)
        SUM(CASE WHEN o.type = 'compra' THEN o.price * o.quantity ELSE 0 END)
          / NULLIF(SUM(CASE WHEN o.type = 'compra' THEN o.quantity ELSE 0 END), 0) AS avg_buy_price,
        o.currency
    FROM operations o
    JOIN instruments i      ON o.instrument_id      = i.id
    JOIN instrument_types it ON i.instrument_type_id = it.id
    JOIN alycs a            ON o.alyc_id            = a.id
    WHERE o.user_id = auth.uid()
    GROUP BY o.instrument_id, i.ticker, i.name, it.name, o.currency
    HAVING SUM(CASE WHEN o.type = 'compra' THEN o.quantity ELSE -o.quantity END) > 0.000001;
END;
$$;

COMMENT ON FUNCTION get_user_holdings_global() IS 'Tenencia global del usuario sin distinción de ALyC. Usada por el Dashboard.';
