import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
    setupFiles: ["./src/test-setup.ts"],
    // `vibe-api.ts` 与 `lib/api.ts` 在 `VITE_API_BASE_URL` 未设置时 fallback 到
    // 相对路径 "/api"。测试断言都是相对路径(`/api/v1/...`),必须把生产 URL
    // 隔离在测试之外 —— 否则 vitest 加载 `.env` 时把生产 base URL 注入到
    // `import.meta.env`,fetch 真实走到 `https://www.efficientinvest.cn/...`,
    // URL 断言全部失败。
    env: {
      VITE_API_BASE_URL: "",
      VITE_BASENAME: "",
      VITE_OSS_BASE_URL: "",
      VITE_GTM_ID: "",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
})
