import { ChevronDown, ChevronRight, Database } from "lucide-react"
import { useState } from "react"
import { parseSources } from "../lib/parse-sources"
import type { RagContext } from "../lib/vibe-types"

/**
 * 「数据来源」折叠面板 —— 嵌入助手气泡下方。
 *
 * 设计要点:
 * - 默认收起,点击 header 展开/收起
 * - 仅在 markdown 非空且 parseSources 返回 ≥1 项时渲染
 * - 解析失败时降级为显示原 markdown 片段(不阻塞主流程)
 * - 卡片不可点击跳转(per spec: 仅展示,不点击)
 * - 视觉风格对齐 shadcn/ui(Tailwind 4 CSS 变量主题)
 */
export function RagContextPanel({ ragContext }: { ragContext: RagContext }) {
  const [expanded, setExpanded] = useState(false)
  const md = ragContext.markdown ?? ""
  if (!md) return null

  const sources = parseSources(md)
  const count = sources.length
  const latency = ragContext.latency_ms ?? 0
  const showFallback = count === 0

  return (
    <div
      data-testid="rag-context-panel"
      className="bg-muted/30 border-border/60 mt-2 overflow-hidden rounded-xl border"
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="text-muted-foreground hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-xs font-medium"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Database className="h-3 w-3" />
        <span>
          📰 数据来源 · {count} 条
          {latency > 0 && (
            <span className="text-muted-foreground/50"> · {Math.round(latency)}ms</span>
          )}
        </span>
      </button>
      {expanded && (
        <div className="border-border/40 space-y-2 border-t px-3 pb-3">
          {sources.map((s, i) => (
            <div
              key={i}
              data-testid="rag-source-card"
              className="bg-background/70 border-border/40 mt-2 rounded-lg border p-2.5"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 font-medium">
                    {s.source}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{s.view}</span>
                  {s.similarity && (
                    <span className="text-muted-foreground/60">
                      · 相似度 {s.similarity}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground/60 text-[10px]">{s.date}</span>
              </div>
              <div className="text-foreground/90 mb-1 text-xs font-medium leading-snug">
                {s.title || "(无标题)"}
              </div>
              {s.body && (
                <div className="text-muted-foreground/80 line-clamp-3 whitespace-pre-wrap text-[11px] leading-relaxed">
                  {s.body.length > 240 ? `${s.body.slice(0, 240)}...` : s.body}
                </div>
              )}
            </div>
          ))}
          {showFallback && (
            <pre
              data-testid="rag-context-fallback"
              className="bg-background/70 mt-2 overflow-x-auto rounded-lg p-2 text-[11px] leading-relaxed whitespace-pre-wrap"
            >
              {md}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}