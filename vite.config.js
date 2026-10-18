import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vite asume que 'public' es la carpeta de estáticos por defecto.

  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'api/**/*.test.js'],
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Nombre estable para el chunk de gráficos: si no, toma el nombre del
        // primer módulo que lo comparte (ej. "real-return-*.js") y confunde
        manualChunks(id) {
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/chartjs-chart-treemap') || id.includes('node_modules/@kurkle')) {
            return 'vendor-charts'
          }
        }
      }
    }
  },
  
  // truco para que Chart siga siendo global y el treemap se cargue
  optimizeDeps: {
    include: ['chart.js', 'chartjs-chart-treemap']
  }
});
