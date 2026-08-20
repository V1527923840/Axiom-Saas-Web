import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_BASENAME': JSON.stringify(process.env.VITE_BASENAME || ''),
  },
  server: {
    // `vibe-api.ts` 与 `lib/api.ts` 在 VITE_API_BASE_URL 未设置时 fallback 到
    // 相对路径 "/api"。生产环境由 nginx 把 /api 转发到后端;开发环境这里需要
    // 把 /api 代理到 Saas-Server (默认 :3000),否则浏览器请求落到 Vite SPA,
    // 命中 vite.historyApiFallback 返回 index.html 但 API 路径会被 404。
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3000",
        changeOrigin: true,
      },
      // ★ Dev-only CORS workaround for Qiniu S3 direct upload.
      // axiom 桶没配 CORS,浏览器 PUT 直传七牛云被预检 OPTIONS 拒绝
      // (返回 403 "CORSResponse: CORS is not enabled for this bucket"),
      // 浏览器报 "Failed to fetch"。
      // 这里把同源请求 `/qiniu-upload/*` 代理到 Qiniu S3 端点,再用
      // changeOrigin=true 把 Host header 改写为 axiom.s3-cn-south-1.qiniucs.com,
      // 与 presigned URL 里 X-Amz-SignedHeaders=host 的签名匹配。
      // 生产环境由运维在 Qiniu 控制台给 axiom 桶加 CORS 规则,这里不再需要。
      "/qiniu-upload": {
        target: "https://axiom.s3-cn-south-1.qiniucs.com",
        changeOrigin: true,
        // 剥掉 `/qiniu-upload` 前缀,让 /qiniu-upload/skills/.../x.zip 变成
        // Qiniu 上的 /skills/.../x.zip
        rewrite: (path) => path.replace(/^\/qiniu-upload/, ""),
      },
    },
  },
  optimizeDeps: {
    // Pre-bundle antd + @ant-design/x to avoid cold-start slowness when the user
    // navigates into the vibe-trading module. The library is mounted locally
    // (only inside `features/vibe-trading/`), so this only matters when the
    // route is actually visited.
    include: ["antd", "@ant-design/x", "@ant-design/icons", "rc-util/es"],
  },
})