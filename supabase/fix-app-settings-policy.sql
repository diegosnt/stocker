-- ============================================================
-- Fix de seguridad #3: Restringir app_settings solo a admins
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Eliminar policy vieja (permite cualquier usuario autenticado)
DROP POLICY IF EXISTS "app_settings: solo autenticados modifican" ON app_settings;

-- Crear policy nueva (solo admins pueden modificar)
CREATE POLICY "app_settings: solo admin modifica"
  ON app_settings FOR UPDATE
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
