/**
 * useUserSkillBindings — caller's personal skill collection + toggle helpers.
 *
 * Returns:
 *   - `favorites: MySkill[]` — every binding (enabled or disabled), the
 *     "我的 Skill" tab iterates this.
 *   - `enabledMap: Record<skillId, true>` — set of enabled skill IDs.
 *   - `bindings: Record<skillId, { enabled: boolean }>` — full state per skill.
 *   - `enable`, `disable`, `favorite` mutations (all idempotent, optimistic).
 *
 * The favorite mutation creates a `disabled` binding; the personal tab then
 * shows the skill as 已收藏. Calling `enable` afterwards flips it to
 * 已启用 without re-creating the row.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  disableSkillForUser,
  enableSkillForUser,
  favoriteSkillForUser,
  listMySkills,
  removeSkillFromMySkills,
} from "../services/skill-api"
import type { MySkill } from "@/types/skill"

interface BindingState {
  bindings: Record<string, { enabled: boolean }>
  enabledMap: Record<string, true>
}

function buildBindingsMap(skills: MySkill[]): BindingState {
  const bindings: Record<string, { enabled: boolean }> = {}
  const enabledMap: Record<string, true> = {}
  for (const s of skills) {
    bindings[s.id] = { enabled: s.enabled }
    if (s.enabled) enabledMap[s.id] = true
  }
  return { bindings, enabledMap }
}

export function useUserSkillBindings() {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ["my-skills"],
    queryFn: listMySkills,
    staleTime: 10_000,
  })

  const enable = useMutation({
    mutationFn: (skillId: string) => enableSkillForUser(skillId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["my-skills"] })
      const prev = qc.getQueryData<MySkill[]>(["my-skills"]) ?? []
      return { prev }
    },
    onError: (_e, _v, ctx: { prev: MySkill[] } | undefined) => {
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
      const prev = qc.getQueryData<MySkill[]>(["my-skills"]) ?? []
      return { prev }
    },
    onError: (_e, _v, ctx: { prev: MySkill[] } | undefined) => {
      if (ctx?.prev) qc.setQueryData(["my-skills"], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["my-skills"] })
    },
  })

  /**
   * Bookmark without enabling. If the binding doesn't exist, creates a
   * `disabled` row. If it already exists (any status), leaves it alone.
   * On success the cache is invalidated and the personal tab refreshes.
   */
  const favorite = useMutation({
    mutationFn: (skillId: string) => favoriteSkillForUser(skillId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["my-skills"] })
    },
  })

  /**
   * Drop the skill from the caller's personal collection. Idempotent.
   * The personal tab (`useMySkills` cache) is invalidated so the card
   * disappears after the confirm dialog closes.
   */
  const remove = useMutation({
    mutationFn: (skillId: string) => removeSkillFromMySkills(skillId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["my-skills"] })
    },
  })

  const favorites = list.data ?? []
  const { bindings, enabledMap } = buildBindingsMap(favorites)
  // 给 VibeTrading 等"只关心已启用"的下游用的派生选择器 —
  // session 挂载只接受 enabled binding,disabled favorites 不显示。
  const enabledSkills = favorites.filter((s) => s.enabled)

  return {
    favorites,
    bindings,
    enabledMap,
    enabledSkills,
    isLoading: list.isLoading,
    error: list.error,
    enable: enable.mutateAsync,
    disable: disable.mutateAsync,
    favorite: favorite.mutateAsync,
    remove: remove.mutateAsync,
    isToggling:
      enable.isPending ||
      disable.isPending ||
      favorite.isPending ||
      remove.isPending,
  }
}