// Supabase ya está cargado globalmente desde /js/vendor/supabase.js vía renderPage.js
const { createClient } = window.supabase

const url = window.__SUPABASE_URL__
const key = window.__SUPABASE_ANON_KEY__

if (!url || !key) {
  console.error('Supabase no configurado. Revisá el archivo .env')
}

export const supabase = createClient(url, key)
