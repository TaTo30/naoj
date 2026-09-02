import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Build config for distributing the module as a standalone compiled bundle
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // Shared deps are injected at runtime by the host app; do not bundle them
      external: ['vue', 'vue-router', '@naoj/core', '@naoj/components'],
    },
  },
})
