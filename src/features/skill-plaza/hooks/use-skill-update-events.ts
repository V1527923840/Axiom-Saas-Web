import { useQuery } from "@tanstack/react-query"
import { listSkillUpdateEvents } from "../services/skill-api"

export function useSkillUpdateEvents(skillId: string | null) {
  return useQuery({
    queryKey: ["skill", skillId, "updates"],
    queryFn: () => listSkillUpdateEvents(skillId!),
    enabled: Boolean(skillId),
    staleTime: 30_000,
  })
}