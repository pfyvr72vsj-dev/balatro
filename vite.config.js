import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base：GitHub Pages 部署时（DEPLOY_TARGET=pages）用 /balatro/（仓库名），本地用相对路径
export default defineConfig({
  plugins: [vue()],
  base: process.env.DEPLOY_TARGET === 'pages' ? '/balatro/' : './',
})
