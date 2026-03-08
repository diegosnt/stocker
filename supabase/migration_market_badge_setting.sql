-- ============================================================
-- MIGRACIÓN: Indicador de mercado en app_settings
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

INSERT INTO app_settings (key, value, updated_by)
VALUES ('market_badge_enabled', 'true', 'system')
ON CONFLICT (key) DO NOTHING;
