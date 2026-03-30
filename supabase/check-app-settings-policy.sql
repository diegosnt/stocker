-- ============================================================
-- Verificar estado actual de la policy de app_settings
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Ver policies actuales de app_settings
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'app_settings';

-- Verificar si hay usuarios con rol admin en user_metadata
-- (Esto muestra los JWT claims de un usuario existente)
-- SELECT 
--   id,
--   email,
--   raw_user_meta_data->>'role' as role
-- FROM auth.users
-- WHERE raw_user_meta_data->>'role' = 'admin';
