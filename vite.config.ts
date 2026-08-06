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
  optimizeDeps: {
    // Pre-bundle antd + @ant-design/x to avoid cold-start slowness when the user
    // navigates into the vibe-trading module. The library is mounted locally
    // (only inside `features/vibe-trading/`), so this only matters when the
    // route is actually visited.
    include: ["antd", "@ant-design/x", "@ant-design/icons", "rc-util/es"],
  },
})