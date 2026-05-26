import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
    build: {
    target: 'esnext', // современный синтаксис для мобильных браузеров
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // убираем console.log в проде
        drop_debugger: true,
      },
    },
  },
  plugins: [vue()],
})
