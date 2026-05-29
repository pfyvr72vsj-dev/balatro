import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// TODO: 部署时把 'balatro' 改成实际 repo 名
export default defineConfig({
  plugins: [vue()],
  base: process.env.DEPLOY_TARGET === 'pages' ? '/balatro/' : './',
})
