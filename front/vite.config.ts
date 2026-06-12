import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
      react(),
      tailwindcss(),
  ],

  resolve: {
    alias: {'@' : path.resolve(__dirname, './src')},
    // 모노레포 워크스페이스(shared)에서 React 가 중복 로드되어 useRef null(흰 화면) 이 나는 것 방지.
    // 설치 위치(루트/워크스페이스)와 무관하게 react / react-dom 을 단일 인스턴스로 강제.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 30001,
    proxy: {
      '/api': {target: 'http://localhost:8080', changeOrigin: true}
    }
  }
})