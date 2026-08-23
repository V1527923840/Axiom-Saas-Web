/**
 * Test helpers for components/hooks that depend on QueryClient (TanStack Query).
 *
 * 用法:
 *   import { renderHookWithQuery, renderWithQuery } from "@/test-utils"
 *   const { result } = renderHookWithQuery(() => useMyHook())
 *
 * 没有 QueryClientProvider 的 QueryClient hook 在测试里会抛
 * "No QueryClient set" — 这个 wrapper 跟生产一致地包一层 provider,
 * 每个测试拿到独立的 client(避免 cache 串味)。
 */
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderOptions,
} from "@testing-library/react"

/* eslint-disable react-refresh/only-export-components */
// 测试 helper 不是 component — react-refresh 不适用,这里集中 disable。

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        // 测试里不需要 staleTime — 让 queryFn 立即跑
        staleTime: 0,
      },
    },
  })
}

interface WrapperProps {
  children: ReactNode
}

export function QueryTestWrapper({ children }: WrapperProps) {
  const client = createTestQueryClient()
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

export function renderWithQuery(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: QueryTestWrapper, ...options })
}

export function renderHookWithQuery<TResult, TProps>(
  callback: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, "wrapper">,
) {
  return renderHook(callback, { wrapper: QueryTestWrapper, ...options })
}
