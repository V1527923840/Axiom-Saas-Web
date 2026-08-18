/**
 * useSkills — paginated list of published skills for the plaza page.
 *
 * Per spec §3.5.6: public endpoint returns status='published' by default.
 */
import { useQuery } from "@tanstack/react-query"
import { listSkills, type ListSkillsParams } from "../services/skill-api"

export function useSkills(params: ListSkillsParams = {}) {
  return useQuery({
    queryKey: ["skills", params],
    queryFn: () => listSkills({ status: "published", ...params }),
    staleTime: 30_000,
  })
}