/**
 * useSkill — single skill detail.
 */
import { useQuery } from "@tanstack/react-query"
import { getSkill } from "../services/skill-api"

export function useSkill(id: string | undefined) {
  return useQuery({
    queryKey: ["skill", id],
    queryFn: () => getSkill(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}