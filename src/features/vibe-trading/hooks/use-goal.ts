// useGoal — wraps the goal REST verbs (vibeApi.createGoal / updateGoal /
// updateGoalStatus) and keeps the per-session goalSnapshot in the Zustand store
// in sync. The hook is intentionally thin: it does NOT manage local loading /
// error state (the upstream mutators throw on failure and the caller is
// expected to surface a user-facing alert). The snapshot returned from the
// store is reactive — components re-render automatically when the snapshot
// changes via setGoalSnapshot / clearGoalSnapshot (called from this hook) or
// from elsewhere (e.g. an SSE goal_event handler in a future task).

import { useCallback, useEffect } from "react"
import { vibeApi } from "../services/vibe-api"
import { useSessionStore } from "../stores/session-store"

export function useGoal(sessionId: string | null) {
  // Read the snapshot straight from the per-session slot. `s.byId[sessionId]`
  // is `undefined` when the slot hasn't been `ensure()`d yet — fall back to
  // `null` so the UI sees a stable "no goal" state on a fresh session.
  const snapshot = useSessionStore((s) =>
    sessionId ? s.byId[sessionId]?.goalSnapshot ?? null : null,
  )

  // ── 目标快照自动水合 ───────────────────────────────────────────────────
  // 关键场景:刷新页面 / 切换到一个从未访问过的 session 时,store 里对应的 slot
  // 不存在或 goalSnapshot=null 但 goalLoaded=false。如果 hook 只读不写,UI 永远
  // 看不到 GoalChip / GoalPanel。这里在 sessionId 变化时主动调一次 GET /goal:
  //   - 服务有目标 → setGoalSnapshot(sid, fresh) → 渲染 GoalChip
  //   - 服务无目标 → clearGoalSnapshot(sid)         → null,符合"确实没有"的语义
  // 任何一种路径都会把 goalLoaded 置 true,避免反复拉。
  //
  // 错误兜底:网络/服务异常时也要置 true,否则会因为 dependency 不变而无限重拉。
  // 错误不在 UI 上暴露(同其它 fetch 失败的处理方式一致);用户在 ChatDialog 里
  // 可以手动用 refresh() 重新拉一次。
  useEffect(() => {
    if (!sessionId) return
    // ensure 让 slot 存在:setGoalSnapshot / clearGoalSnapshot 都会在 slot 不
    // 存在时直接 early return,刷新后初次进入会话或切到一个全新 session 时
    // 不会触发 use-chat-stream 的 ensure (它是订阅 /events 时跑的,这里只是
    // 占位渲染),所以 hook 自己负责创建 slot。
    useSessionStore.getState().ensure(sessionId)
    if (useSessionStore.getState().byId[sessionId]?.goalLoaded) return
    let cancelled = false
    vibeApi
      .getGoal(sessionId)
      .then((fresh) => {
        if (cancelled) return
        if (fresh) useSessionStore.getState().setGoalSnapshot(sessionId, fresh)
        else useSessionStore.getState().clearGoalSnapshot(sessionId)
      })
      .catch(() => {
        if (cancelled) return
        // 失败也要标记已加载,避免受失败的 effect 反复触发;
        // 仍暴露 refresh() 给 UI 用来手动重试。
        useSessionStore.setState((s) => {
          const c = s.byId[sessionId]
          if (!c) return s
          return { byId: { ...s.byId, [sessionId]: { ...c, goalLoaded: true } } }
        })
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const create = useCallback(
    async (objective: string) => {
      if (!sessionId) throw new Error("no session")
      const fresh = await vibeApi.createGoal(sessionId, { objective })
      useSessionStore.getState().setGoalSnapshot(sessionId, fresh)
      return fresh
    },
    [sessionId],
  )

  const edit = useCallback(
    async (objective: string) => {
      if (!sessionId || !snapshot) throw new Error("no active goal")
      const res = await vibeApi.updateGoal(sessionId, {
        goal_id: snapshot.goal.goal_id,
        expected_goal_id: snapshot.goal.goal_id,
        objective,
      })
      useSessionStore.getState().setGoalSnapshot(sessionId, res.snapshot)
      return res.snapshot
    },
    [sessionId, snapshot],
  )

  const cancel = useCallback(async () => {
    if (!sessionId || !snapshot) return
    await vibeApi.updateGoalStatus(sessionId, {
      goal_id: snapshot.goal.goal_id,
      expected_goal_id: snapshot.goal.goal_id,
      status: "cancelled",
      recap: "Cancelled from Web UI.",
    })
    useSessionStore.getState().clearGoalSnapshot(sessionId)
  }, [sessionId, snapshot])

  const refresh = useCallback(async () => {
    if (!sessionId) return null
    const fresh = await vibeApi.getGoal(sessionId)
    if (fresh) useSessionStore.getState().setGoalSnapshot(sessionId, fresh)
    else useSessionStore.getState().clearGoalSnapshot(sessionId)
    return fresh
  }, [sessionId])

  return { snapshot, create, edit, cancel, refresh }
}
