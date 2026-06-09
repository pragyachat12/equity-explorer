import { defineConfig } from 'vite';

export default defineConfig({
  base: '/stock-fundamentals/',
  build: { outDir: 'dist' },
  server: {
    proxy: {
      '/sec-facts': {
        target: 'https://data.sec.gov',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/sec-facts/, ''),
        headers: { 'User-Agent': 'stock-fundamentals-dashboard contact@example.com' }
      },
      '/sec-files': {
        target: 'https://www.sec.gov',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/sec-files/, ''),
        headers: { 'User-Agent': 'stock-fundamentals-dashboard contact@example.com' }
      }
    }
  }
});