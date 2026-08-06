"use client"

import { ConfigProvider } from "antd"
import zhCN from "antd/locale/zh_CN"
import type { ReactNode } from "react"

/**
 * Local Ant Design X provider.
 *
 * Mounted at the page level (not globally) so the antd runtime is only paid
 * for when the user navigates into the vibe-trading module. The theme is
 * bridged via `cssVar: true` + CSS variable overrides in `src/index.css` —
 * antd emits `--ant-color-*` tokens, which are mapped to the project's
 * `--primary`, `--card`, `--foreground`, etc. The `.dark` class toggle
 * managed by the global ThemeProvider automatically propagates.
 *
 * `hashed: false` keeps antd from generating per-instance hash class names,
 * which would conflict with Tailwind's preflight reset.
 */
export function XThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        cssVar: true,
        hashed: false,
        token: {
          borderRadius: 10,
          borderRadiusLG: 12,
          fontFamily:
            "var(--font-inter), 'Inter', system-ui, -apple-system, sans-serif",
        },
      }}
      componentSize="middle"
    >
      {children}
    </ConfigProvider>
  )
}