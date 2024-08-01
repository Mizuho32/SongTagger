import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 任意のIPアドレスからの接続を許可
    //port: 3000 // 使用したいポート番号を指定
    proxy: {
      '/api': {
        target: 'http://mouse.rimo:8000', // APIサーバーのURL
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') // /apiを除去する場合
      }
    }
  }
})
