import { Check, Loader2, Wrench } from "lucide-react"
import { useMemo } from "react"
import { tryParseToolJson } from "../lib/parse-message"

export function ToolCallBlock({ content, closed }: { content: string; closed: boolean }) {
  const parsed = useMemo(() => tryParseToolJson(content), [content])
  const name =
    parsed.ok && parsed.data && typeof parsed.data === "object" && "name" in parsed.data
      ? String((parsed.data as Record<string, unknown>).name)
      : "工具"
  return (
    <div className="text-muted-foreground my-1 flex items-center gap-1.5 text-xs">
      {closed ? (
        <Check className="h-3 w-3 text-green-600" aria-hidden />
      ) : (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      )}
      <Wrench className="h-3 w-3 opacity-60" aria-hidden />
      <span>{closed ? `${name}` : `${name} 中…`}</span>
    </div>
  )
}
