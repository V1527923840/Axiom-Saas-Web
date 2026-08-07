// useGoal — wraps the goal REST verbs (vibeApi.createGoal / updateGoal /
// updateGoalStatus) and keeps the per-session goalSnapshot in the Zustand store
// in sync. The hook is intentionally thin: it does NOT manage local loading /
// error state (the upstream mutators throw on failure and the caller is
// expected to surface a user-facing alert). The snapshot returned from the
// store is reactive — components re-render automatically when the snapshot
// changes via setGoalSnapshot / clearGoalSnapshot (called from this hook) or
// from elsewhere (e.g. an SSE goal_event handler in a future task).

import { useCallback } from "react"
import { vibeApi } from "../services/vibe-api"
import { useSessionStore } from "../stores/session-store"

export function useGoal(sessionId: string | null) {
  // Read the snapshot straight from the per-session slot. `s.byId[sessionId]`
  // is `undefined` when the slot hasn't been `ensure()`d yet — fall back to
  // `null` so the UI sees a stable "no goal" state on a fresh session.
  const snapshot = useSessionStore((s) =>
    sessionId ? s.byId[sessionId]?.goalSnapshot ?? null : null,
  )

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
