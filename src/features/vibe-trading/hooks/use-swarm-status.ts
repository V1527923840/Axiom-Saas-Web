// useSwarmStatus — returns the per-session swarm-status snapshot list and
// keeps it in sync with the server's running/pending runs.
//
// Why this hook exists: SwarmStatusCard is rendered from synthetic messages
// with `type: "swarm_status"` in the per-session slot. Those messages are
// populated by the SSE handler (swarm.started / swarm.event). On page refresh
// or session switch the in-memory store is wiped — the synthetic messages
// vanish and the card disappears even though the upstream run is still in
// progress. The session SSE only delivers *new* events from the moment of
// re-subscription, so we have to fetch the current state via REST.
//
// Hydration contract (mirrors `useGoal`):
//   - on sessionId change, ensure the slot exists and `swarmLoaded` is false
//   - GET /v1/ai-agent/swarm/runs → filter to running/pending
//   - for each, GET /v1/ai-agent/swarm/runs/:id → buildSwarmStatusFromStarted
//   - upsertSwarmStatus so the card re-renders
//   - mark swarmLoaded=true even on failure (no infinite retry)
//
// The `swarmLoaded` flag survives softReset (which uses `...cur` spread), so
// switching sessions in-tab and back doesn't re-fetch unnecessarily.

import { useEffect, useMemo } from "react"
import { vibeApi } from "../services/vibe-api"
import { buildSwarmStatusFromStarted } from "../lib/swarm-status"
import { useSessionStore } from "../stores/session-store"
import type { SwarmRunStatus } from "../lib/vibe-types"

type AnyRecord = Record<string, unknown>

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function isActiveRun(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const status = (value as AnyRecord).status
  return status === "running" || status === "pending"
}

export function useSwarmStatus(sessionId: string | null): {
  statuses: SwarmRunStatus[]
  refresh: () => Promise<void>
} {
  // 订阅稳定的 messages 数组 (Zustand 用 Object.is 比较;只有在 messages
  // 实际变化时才触发 re-render)。statuses 派生在 useMemo 里做。
  // 直接在 selector 里 return 一个新数组会让 React 每次 render 都拿到新
  // 引用,触发 "Maximum update depth exceeded" 循环。
  const messages = useSessionStore((s) =>
    sessionId ? s.byId[sessionId]?.messages : undefined,
  )
  const statuses = useMemo<SwarmRunStatus[]>(() => {
    if (!messages) return EMPTY
    const out: SwarmRunStatus[] = []
    for (const m of messages) {
      if (m.type === "swarm_status" && m.swarmStatus) out.push(m.swarmStatus)
    }
    return out
  }, [messages])

  const refresh = useMemo(
    () => async () => {
      // 留作后续手动重试入口 (e.g. UI 错误后 retry),与 hydration effect 共享
      // 同一段 fetch / upsert 逻辑。
      if (!sessionId) return
      useSessionStore.getState().ensure(sessionId)
      try {
        await hydrate(sessionId)
      } finally {
        useSessionStore.setState((s) => {
          const c = s.byId[sessionId]
          if (!c) return s
          // 即使失败前面也置 true,跟 hydration effect 的失败兜底保持一致
          return { byId: { ...s.byId, [sessionId]: { ...c, swarmLoaded: true } } }
        })
      }
    },
    [sessionId],
  )

  // Hydration: 在 sessionId 变化时补一次历史。
  useEffect(() => {
    if (!sessionId) return
    useSessionStore.getState().ensure(sessionId)
    if (useSessionStore.getState().byId[sessionId]?.swarmLoaded) return
    let cancelled = false
    hydrate(sessionId)
      .catch(() => {
        // 静默失败:卡片暂时不显示,等下一次 sessionId 变化再重试
      })
      .finally(() => {
        if (cancelled) return
        useSessionStore.setState((s) => {
          const c = s.byId[sessionId]
          if (!c) return s
          return { byId: { ...s.byId, [sessionId]: { ...c, swarmLoaded: true } } }
        })
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  return { statuses, refresh }
}

const EMPTY: SwarmRunStatus[] = []

async function hydrate(sessionId: string): Promise<void> {
  const list = (await vibeApi.listSwarmRuns(20)) as unknown[]
  const active = list.filter(isActiveRun)
  if (active.length === 0) return
  for (const item of active) {
    const runId = asString((item as AnyRecord).run_id) ?? asString((item as AnyRecord).id)
    if (!runId) continue
    // eslint-disable-next-line no-await-in-loop -- sequential to avoid stampede
    const detail = await vibeApi.getSwarmRun(runId)
    if (!detail || typeof detail !== "object") continue
    const status = buildSwarmStatusFromStarted(detail as AnyRecord)
    if (!status) continue
    // 双重过滤:detail 的状态可能已经变成终态 (running -> completed 是常见路径)。
    if (status.status !== "running" && status.status !== "pending") continue
    useSessionStore.getState().upsertSwarmStatus(sessionId, status)
  }
}
