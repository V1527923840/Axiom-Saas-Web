/**
 * useSessionSkills — session-level skill mounts (add/remove deltas).
 *
 * per spec §3.5.2 — session mount deltas override user baseline.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listSessionMounts, setSessionMount } from "../services/skill-api"
import type { MountOp, MountSource, SessionSkillMountItem } from "@/types/skill"

export function useSessionMounts(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["session-mounts", sessionId],
    queryFn: () => listSessionMounts(sessionId!),
    enabled: !!sessionId,
    staleTime: 5_000,
  })
}

export function useSetSessionMount(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      skillId,
      op,
      source,
    }: {
      skillId: string
      op: MountOp
      source?: MountSource
    }) => setSessionMount(sessionId, skillId, op, source ?? "manual"),
    onMutate: async ({ skillId, op }) => {
      await qc.cancelQueries({ queryKey: ["session-mounts", sessionId] })
      const prev =
        qc.getQueryData<SessionSkillMountItem[]>([
          "session-mounts",
          sessionId,
        ]) ?? []
      // optimistic: replace if exists else append
      const next = prev.filter((m) => m.skillId !== skillId).concat({
        skillId,
        op,
        source: "manual",
        mountedAt: new Date().toISOString(),
      })
      qc.setQueryData(["session-mounts", sessionId], next)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["session-mounts", sessionId], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["session-mounts", sessionId] })
    },
  })
}