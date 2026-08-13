"use client"

import { ConfigProvider, theme } from "antd"
import zhCN from "antd/locale/zh_CN"
import { useEffect, useMemo, useState, type ReactNode } from "react"

/**
 * Local Ant Design X provider for the vibe-trading module.
 *
 * Mounted at the page level (not globally) so antd only loads when this route
 * is visited.
 *
 * Theme bridge strategy: read the project's existing CSS variables
 * (--primary, --card, --foreground, --border, --radius) at runtime via
 * getComputedStyle and pass them as antd theme tokens. The page-level
 * ThemeProvider toggles a `dark` class on <html> to swap light/dark
 * variable values; we observe that toggle with a MutationObserver and
 * re-render with `theme.darkAlgorithm` (or `defaultAlgorithm`).
 *
 * We deliberately do NOT use `cssVar: true`. In antd v6, cssVar mode emits
 * inline <style> tags at runtime that override our project-level `:root`
 * token overrides — making components fall back to antd defaults and
 * (in dark mode) producing invisible text on dark bubbles.
 */
function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return v || fallback
}

export function XThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])

  const tokens = useMemo(
    () => ({
      colorPrimary: readVar("--primary", "oklch(0.205 0 0)"),
      colorBgContainer: readVar("--card", "oklch(1 0 0)"),
      colorBgElevated: readVar("--popover", "oklch(1 0 0)"),
      colorBgLayout: readVar("--background", "oklch(1 0 0)"),
      colorText: readVar("--foreground", "oklch(0.145 0 0)"),
      colorTextSecondary: readVar("--muted-foreground", "oklch(0.556 0 0)"),
      colorBorder: readVar("--border", "oklch(0.922 0 0)"),
      colorBorderSecondary: readVar("--border", "oklch(0.922 0 0)"),
      borderRadius: 10,
      borderRadiusLG: 12,
      fontFamily:
        "var(--font-inter), 'Inter', system-ui, -apple-system, sans-serif",
    }),
    [isDark],
  )

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: tokens,
        // antd 6 的 ConfigProvider.components 类型是 antd 自己的
        // ComponentsConfig,不包含 @ant-design/x 的 Bubble / Sender —— 但
        // 运行时 antd 把 components 当 token 字典逐 key 解析,未知 key 不
        // 会报错,所以这里 cast 跳过类型检查。若 antd 未来在 ComponentsConfig
        // 里加上同名 key,cast 会失效,届时可以清理。
        components: {
          Bubble: {
            borderRadius: 12,
            borderRadiusLG: 16,
          },
          Sender: {
            borderRadius: 10,
          },
        } as never,
      }}
      componentSize="middle"
    >
      {children}
    </ConfigProvider>
  )
}