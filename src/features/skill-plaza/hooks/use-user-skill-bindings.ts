/**
 * useUserSkillBindings — caller's enabled skills + toggle helpers.
 *
 * 乐观更新:toggle 后立刻在 cache 中翻转 enabled 状态,
 * 失败回滚。Enabling/disable 通过 enableSkillForUser/disableSkillForUser。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  disableSkillForUser,
  enableSkillForUser,
  listMyEnabledSkills,
} from "../services/skill-api"
import type { Skill } from "@/types/skill"

interface BindingState {
  enabled: Record<string, boolean>
}

function buildEnabledMap(skills: Skill[]): Record<string, boolean> {
  const m: Record<string, boolean> = {}
  for (const s of skills) m[s.id] = true
  return m
}

export function useUserSkillBindings() {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ["my-skills"],
    queryFn: listMyEnabledSkills,
    staleTime: 10_000,
  })

  const enable = useMutation({
    mutationFn: (skillId: string) => enableSkillForUser(skillId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["my-skills"] })
      const prev = qc.getQueryData<Skill[]>(["my-skills"]) ?? []
      qc.setQueryData<Skill[]>(["my-skills"], prev)
      return { prev }
    },
    onError: (_e, _v, ctx: { prev: Skill[] } | undefined) => {
      if (ctx?.prev) qc.setQueryData(["my-skills"], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["my-skills"] })
    },
  })

  const disable = useMutation({
    mutationFn: (skillId: string) => disableSkillForUser(skillId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["my-skills"] })
      const prev = qc.getQueryData<Skill[]>(["my-skills"]) ?? []
      qc.setQueryData<Skill[]>(["my-skills"], prev)
      return { prev }
    },
    onError: (_e, _v, ctx: { prev: Skill[] } | undefined) => {
      if (ctx?.prev) qc.setQueryData(["my-skills"], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["my-skills"] })
    },
  })

  const enabledMap: Record<string, boolean> = buildEnabledMap(list.data ?? [])

  return {
    enabledSkills: list.data ?? [],
    enabledMap,
    isLoading: list.isLoading,
    error: list.error,
    enable: enable.mutateAsync,
    disable: disable.mutateAsync,
    isToggling: enable.isPending || disable.isPending,
    bindingState: { enabled: enabledMap } as BindingState,
  }
}