-- ============================================================
-- MIGRACIÓN: Tabla app_settings
-- Ejecutar en el SQL Editor de Supabase si ya tenés el schema
-- base instalado y solo querés agregar esta funcionalidad.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings: lectura pública"
  ON app_settings FOR SELECT
  USING (true);

CREATE POLICY "app_settings: solo autenticados modifican"
  ON app_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO app_settings (key, value, updated_by)
VALUES ('registration_enabled', 'true', 'system')
ON CONFLICT (key) DO NOTHING;
