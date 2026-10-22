import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// In dev, /api is served by the Go server (`go run ./server` on :8080).
export default defineConfig({
  plugins: [svelte()],
  server: { proxy: { '/api': 'http://127.0.0.1:8080' } },
  build: { target: 'es2023', assetsInlineLimit: 0 },
});
