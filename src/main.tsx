import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// 本地化 Inter Variable 字体:替代原本从 fonts.googleapis.com /
// fonts.gstatic.com 加载的 Google Fonts,生产环境无代理时国内可访问。
// woff2 由 Vite 自动打包进 bundle;src/index.css 里 --font-inter 链到
// 'Inter Variable' 字体族。
import '@fontsource-variable/inter'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
