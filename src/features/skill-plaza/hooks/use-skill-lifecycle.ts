import { useMutation, useQueryClient } from "@tanstack/react-query"
import { archiveSkill, restoreSkill } from "../services/skill-api"

export function useSkillArchive(skillId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason?: string) => archiveSkill(skillId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] })
      qc.invalidateQueries({ queryKey: ["skill", skillId] })
      qc.invalidateQueries({ queryKey: ["skill", skillId, "updates"] })
      // 「我的 Skill」tab 用 ['my-skills'] 缓存自己的列表 —— archive
      // 会 cascade disable 用户端的 binding (server Fix 1),所以这里
      // 也得 invalidate,否则 banner / 启用状态会跟服务端错位。
      qc.invalidateQueries({ queryKey: ["my-skills"] })
    },
  })
}

export function useSkillRestore(skillId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason?: string) => restoreSkill(skillId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] })
      qc.invalidateQueries({ queryKey: ["skill", skillId] })
      qc.invalidateQueries({ queryKey: ["skill", skillId, "updates"] })
      // restore 不主动 cascade 重启 binding,但 binding 行从 disabled
      // 重新可见,「我的 Skill」tab 的 archived banner 应该消失。
      qc.invalidateQueries({ queryKey: ["my-skills"] })
    },
  })
}