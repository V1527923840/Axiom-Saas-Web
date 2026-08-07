import { memo } from "react"
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react"
import type {
  SwarmAgentDisplayStatus,
  SwarmRunStatus,
} from "../lib/vibe-types"

interface Props {
  status: SwarmRunStatus
}

// Stub: Saas 项目暂未实现 i18n 工具名映射,直接返回原始字符串。
function localizeToolName(name: string, fallback: string): string {
  return name || fallback
}

function formatElapsed(seconds: number | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "-"
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

function statusTone(status: SwarmAgentDisplayStatus): string {
  switch (status) {
    case "done":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    case "failed":
      return "bg-destructive/10 text-destructive"
    case "blocked":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    case "retry":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400"
    case "running":
      return "bg-primary/10 text-primary"
    case "cancelled":
      return "bg-muted text-muted-foreground"
    case "waiting":
    default:
      return "bg-muted text-muted-foreground"
  }
}

function StatusIcon({ status }: { status: SwarmAgentDisplayStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-3 w-3" />
    case "failed":
      return <XCircle className="h-3 w-3" />
    case "blocked":
      return <ShieldAlert className="h-3 w-3" />
    case "retry":
      return <RotateCcw className="h-3 w-3" />
    case "running":
      return <Loader2 className="h-3 w-3 animate-spin" />
    case "cancelled":
      return <XCircle className="h-3 w-3" />
    case "waiting":
    default:
      return <Circle className="h-3 w-3" />
  }
}

function runTone(status: SwarmRunStatus["status"]): string {
  switch (status) {
    case "completed":
      return "text-emerald-600 dark:text-emerald-400"
    case "failed":
      return "text-destructive"
    case "cancelled":
      return "text-muted-foreground"
    case "running":
      return "text-primary"
    case "pending":
    case "unknown":
    default:
      return "text-muted-foreground"
  }
}

export const SwarmStatusCard = memo(function SwarmStatusCard({ status }: Props) {
  // done 计数:把所有"已终结"的 agent (done / failed / blocked / cancelled) 计入 done
  const done = status.agents.filter((agent) =>
    ["done", "failed", "blocked", "cancelled"].includes(agent.status),
  ).length
  // 总数使用 status.totalLayers 字段(规格要求 "3/6 agents"),当字段为 0 时回退到当前 agents 数。
  const total = status.totalLayers > 0 ? status.totalLayers : status.agents.length
  const layerTotal = Math.max(status.totalLayers, status.currentLayer + 1, 1)
  const layerCurrent = Math.min(status.currentLayer + 1, layerTotal)

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Users className="h-4 w-4" />
      </div>
      {/* `!bg-background` 覆盖 antd-x Bubble `variant="filled"` 注入的彩色背景,确保沙盒风格。 */}
      <div className="min-w-0 flex-1 rounded-lg border bg-background !bg-background p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{status.preset}</span>
            <span className={["shrink-0 text-xs font-medium capitalize", runTone(status.status)].join(" ")}>
              {status.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{`${done}/${total || 0} agents`}</span>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
          {/* 内联 ProgressBar:简单 <progress> + 视觉填充 div,不依赖 AxiomVibeTrading 的 chat/ProgressBar 组件。 */}
          <div className="flex items-center gap-2 min-w-0" aria-label="Swarm agent progress">
            <progress
              value={total ? done : 0}
              max={Math.max(total, 1)}
              className="sr-only"
              aria-label="Swarm agent progress"
            />
            <div className="bg-muted rounded-full overflow-hidden flex-1 h-1">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, (total ? (done / total) : 0) * 100))}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
              {total ? done : 0}/{Math.max(total, 1)}
            </span>
          </div>
          <div className="text-right font-mono text-[11px] text-muted-foreground">
            {`第 ${layerCurrent}/${layerTotal} 层`}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[10rem_7rem_9rem_5rem_4rem_minmax(0,1fr)] gap-2 border-b pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>agent</span>
              <span>状态</span>
              <span>工具</span>
              <span className="text-right">耗时</span>
              <span className="text-right">迭代</span>
              <span>输出</span>
            </div>
            <div className="divide-y">
              {status.agents.map((agent) => (
                <div
                  key={`${agent.taskId || agent.agentId}`}
                  className="grid grid-cols-[10rem_7rem_9rem_5rem_4rem_minmax(0,1fr)] gap-2 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{agent.agentId}</div>
                    {agent.role && <div className="truncate text-[10px] text-muted-foreground">{agent.role}</div>}
                  </div>
                  <div>
                    <span className={["inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize", statusTone(agent.status)].join(" ")}>
                      <StatusIcon status={agent.status} />
                      {agent.status}
                    </span>
                  </div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground" title={agent.tool || ""}>
                    {agent.tool ? localizeToolName(agent.tool, agent.tool) : "-"}
                  </div>
                  <div className="text-right font-mono text-[11px] text-muted-foreground">
                    {formatElapsed(agent.elapsed_s)}
                  </div>
                  <div className="text-right font-mono text-[11px] text-muted-foreground">
                    {agent.iterations ?? "-"}
                  </div>
                  <div className={["truncate text-[11px]", agent.error ? "text-destructive" : "text-muted-foreground"].join(" ")} title={agent.error || agent.lastText || ""}>
                    {agent.error || agent.lastText || "-"}
                  </div>
                </div>
              ))}
              {status.agents.length === 0 && (
                <div className="py-3 text-xs text-muted-foreground">
                  等待事件
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})