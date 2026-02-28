function renderPage({ supabaseUrl, supabaseAnonKey }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stocker</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="stylesheet" href="/css/water.min.css">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <div id="app">
    <div class="app-loading">
      <p>Cargando...</p>
    </div>
  </div>

  <script>
    window.__SUPABASE_URL__      = ${JSON.stringify(supabaseUrl)};
    window.__SUPABASE_ANON_KEY__ = ${JSON.stringify(supabaseAnonKey)};
  </script>
  <script type="module" src="/js/app.js"></script>
</body>
</html>`
}

module.exports = { renderPage }
