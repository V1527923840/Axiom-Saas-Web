import { useMutation, useQueryClient } from "@tanstack/react-query"
import { archiveSkill, restoreSkill } from "../services/skill-api"

export function useSkillArchive(skillId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason?: string) => archiveSkill(skillId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] })
      qc.invalidateQueries({ queryKey: ["skill", skillId] })
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
    },
  })
}