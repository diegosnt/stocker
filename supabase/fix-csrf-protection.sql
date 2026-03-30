-- ============================================================
-- Fix de seguridad #2: Protección CSRF
-- Este fix no requiere cambios en la base de datos.
-- La verificación se hace en el código del backend (server.js).
-- ============================================================

-- Para probar manualmente:
-- 1. Iniciar sesión en la app
-- 2. Abrir DevTools → Network tab
-- 3. Hacer una mutación (crear operación, editar instrumento, etc.)
-- 4. Verificar que el request tiene header: X-CSRF-Token: <valor>

-- Para probar que CSRF está funcionando:
-- 1. Hacer un request sin el header X-CSRF-Token
-- 2. Debe devolver: 403 { "error": "Token de seguridad inválido" }
