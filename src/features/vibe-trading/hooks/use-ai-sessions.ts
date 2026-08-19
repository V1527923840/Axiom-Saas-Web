import { useCallback, useEffect, useState } from "react"
import {
  createSession,
  deleteSession,
  listSessions,
  patchSession,
} from "../services/vibe-api"
import type { AiSession } from "../lib/vibe-types"

export function useAiSessions(agentType: string) {
  const [sessions, setSessions] = useState<AiSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listSessions(agentType)
      setSessions(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions")
    } finally {
      setLoading(false)
    }
  }, [agentType])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addSession = useCallback(async () => {
    const s = await createSession(agentType)
    setSessions((prev) => [s, ...prev])
    return s
  }, [agentType])

  const removeSession = useCallback(async (id: string) => {
    await deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const updateTitle = useCallback(async (id: string, newTitle: string) => {
    const updated = await patchSession(id, { title: newTitle })
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? updated : s)),
    )
  }, [])

  return {
    sessions,
    loading,
    error,
    refresh,
    addSession,
    removeSession,
    updateTitle,
  }
}