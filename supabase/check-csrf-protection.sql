-- ============================================================
-- Verificar estado de protección CSRF
-- Ejecución local (verificar configuración en código)
-- ============================================================

-- Este fix no requiere cambios en la base de datos.
-- La verificación se hace en el código del backend (server.js).

-- Para verificar manualmente:
-- 1. Abrir DevTools en el navegador
-- 2. Ir a Network tab
-- 3. Hacer una mutación (crear/editar operación)
-- 4. Verificar que el request tiene header 'X-CSRF-Token'
