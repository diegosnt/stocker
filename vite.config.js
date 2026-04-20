import { defineConfig } from 'vite';

export default defineConfig({
  // Vite asume que 'public' es la carpeta de estáticos por defecto.
  
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
  },
  
  // truco para que Chart siga siendo global y el treemap se cargue
  optimizeDeps: {
    include: ['chart.js', 'chartjs-chart-treemap']
  }
});
