function renderPage({ supabaseUrl, supabaseAnonKey }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stocker</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="stylesheet" href="/css/styles.css">
  <script src="/js/vendor/supabase.js"></script>
  <script src="/js/vendor/chart.js"></script>
  <script src="/js/vendor/jspdf.js"></script>
  <script src="/js/vendor/html2canvas.js"></script>
</head>
<body>
  <div id="app">
    <!-- El Skeleton inicial se renderiza vía JS en app.js o DashboardPage -->
    <div class="app-loading">
      <div class="skeleton" style="height: 100vh; width: 100%"></div>
    </div>
  </div>

  <script>
    window.__SUPABASE_URL__      = ${JSON.stringify(supabaseUrl)};
    window.__SUPABASE_ANON_KEY__ = ${JSON.stringify(supabaseAnonKey)};
  </script>
  <script type="module" src="/js/init.js?v=4"></script>
  </body>
  </html>`
  }


module.exports = { renderPage }
