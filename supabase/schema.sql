-- ============================================================
-- STOCKER - Schema de base de datos
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: instrument_types (Tipos de instrumento: Acción, CEDEAR)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS instrument_types (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instrument_types_user ON instrument_types(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_instrument_types_name_user ON instrument_types(user_id, name);

-- ------------------------------------------------------------
-- Tabla: instruments (Instrumentos: AAPL, GGAL, etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS instruments (
  id                   UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker               TEXT  NOT NULL,
  name                 TEXT  NOT NULL,
  instrument_type_id   UUID  REFERENCES instrument_types(id) ON DELETE RESTRICT NOT NULL,
  user_id              UUID  REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instruments_user       ON instruments(user_id);
CREATE INDEX IF NOT EXISTS idx_instruments_type       ON instruments(instrument_type_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_ticker_user ON instruments(user_id, ticker);

-- ------------------------------------------------------------
-- Tabla: alycs (Agentes de Liquidación y Compensación)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alycs (
  id         UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT  NOT NULL,
  cuit       TEXT,
  website    TEXT,
  user_id    UUID  REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alycs_user ON alycs(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alycs_name_user ON alycs(user_id, name);

-- ------------------------------------------------------------
-- Tabla: operations (Operaciones de compra/venta)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operations (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  type          TEXT    NOT NULL CHECK (type IN ('compra', 'venta')),
  instrument_id UUID    REFERENCES instruments(id) ON DELETE RESTRICT NOT NULL,
  alyc_id       UUID    REFERENCES alycs(id) ON DELETE RESTRICT NOT NULL,
  quantity      NUMERIC NOT NULL CHECK (quantity > 0),
  price         NUMERIC NOT NULL CHECK (price > 0),
  currency      TEXT    NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  operated_at   DATE    NOT NULL,
  notes         TEXT,
  user_id       UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operations_user        ON operations(user_id);
CREATE INDEX IF NOT EXISTS idx_operations_instrument  ON operations(instrument_id);
CREATE INDEX IF NOT EXISTS idx_operations_alyc        ON operations(alyc_id);
CREATE INDEX IF NOT EXISTS idx_operations_date        ON operations(operated_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- Cada usuario accede únicamente a sus propios registros
-- ============================================================

ALTER TABLE instrument_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alycs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations       ENABLE ROW LEVEL SECURITY;

-- Políticas para instrument_types
CREATE POLICY "instrument_types: usuario solo ve los suyos"
  ON instrument_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "instrument_types: usuario solo inserta los suyos"
  ON instrument_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "instrument_types: usuario solo actualiza los suyos"
  ON instrument_types FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "instrument_types: usuario solo elimina los suyos"
  ON instrument_types FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para instruments
CREATE POLICY "instruments: usuario solo ve los suyos"
  ON instruments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "instruments: usuario solo inserta los suyos"
  ON instruments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "instruments: usuario solo actualiza los suyos"
  ON instruments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "instruments: usuario solo elimina los suyos"
  ON instruments FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para alycs
CREATE POLICY "alycs: usuario solo ve los suyos"
  ON alycs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "alycs: usuario solo inserta los suyos"
  ON alycs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alycs: usuario solo actualiza los suyos"
  ON alycs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alycs: usuario solo elimina los suyos"
  ON alycs FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para operations
CREATE POLICY "operations: usuario solo ve las suyas"
  ON operations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "operations: usuario solo inserta las suyas"
  ON operations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "operations: usuario solo actualiza las suyas"
  ON operations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "operations: usuario solo elimina las suyas"
  ON operations FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Tabla: app_settings (Configuración global de la aplicación)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública (necesaria para que la página de login pueda verificar
-- si el registro está habilitado antes de que el usuario esté autenticado)
CREATE POLICY "app_settings: lectura pública"
  ON app_settings FOR SELECT
  USING (true);

-- Solo usuarios autenticados pueden modificar la configuración
CREATE POLICY "app_settings: solo autenticados modifican"
  ON app_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Valor inicial: registro habilitado
INSERT INTO app_settings (key, value, updated_by)
VALUES ('registration_enabled', 'true', 'system')
ON CONFLICT (key) DO NOTHING;
