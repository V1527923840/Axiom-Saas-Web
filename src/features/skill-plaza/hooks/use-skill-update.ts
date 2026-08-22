/**
 * useSkillUpdate — orchestrates update pipeline for an existing skill.
 *
 * Mirrors useSkillUpload (Phase 0 + 1 + 1.5 + 2) but binds to a known
 * skillId. Uses POST /skills/:id/upload-url (returns actorRole) and
 * threads the skill's current updatedAt into phase 2 as expectedUpdatedAt
 * so the server can reject concurrent updates with 409.
 */
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import {
  confirmSkillContent,
  createUpdateUploadUrl,
  putZipToQiniu,
} from "../services/skill-api"
import { normalizeToZip } from "../lib/normalize-to-zip"
import type { Skill } from "@/types/skill"
import type { ConfirmSkillContentForm } from "../schemas/skill"
import type { UploadSourceFormat } from "../types"

interface UseSkillUpdateOptions {
  onSuccess?: (result: { skillId: string; filesCount: number; toolsCount: number }) => void
  onError?: (err: Error) => void
}

export interface UseSkillUpdateInput extends ConfirmSkillContentForm {
  file: File
  format: UploadSourceFormat
}

export function useSkillUpdate(
  skill: Skill,
  options: UseSkillUpdateOptions = {},
) {
  const [progress, setProgress] = useState<0 | 1 | 2 | 3>(0)

  const mutation = useMutation<
    { skillId: string; filesCount: number; toolsCount: number },
    Error,
    UseSkillUpdateInput
  >({
    mutationFn: async (input) => {
      setProgress(1)
      const normalized = await normalizeToZip(input)
      const phase1 = await createUpdateUploadUrl(skill.id, {
        filename: input.file.name.replace(/\.md$|\.zip$/i, "") + ".zip",
        size: normalized.blob.size,
        sourceFormat: normalized.sourceFormat,
        hash: normalized.hash,
      })
      setProgress(2)
      await putZipToQiniu(phase1.uploadUrl, normalized.blob)
      setProgress(3)
      const result = await confirmSkillContent(skill.id, {
        ossKey: phase1.key,
        hash: normalized.hash,
        sourceFormat: normalized.sourceFormat,
        name: input.name,
        description: input.description,
        changelog: input.changelog,
        category: input.category,
        expectedUpdatedAt: phase1.updatedAt,
      })
      return { skillId: result.skillId, filesCount: result.filesCount, toolsCount: result.toolsCount }
    },
    onSuccess: (result) => {
      setProgress(0)
      options.onSuccess?.(result)
    },
    onError: (err) => {
      setProgress(0)
      options.onError?.(err)
    },
  })

  return {
    ...mutation,
    progress,
    reset: () => {
      setProgress(0)
      mutation.reset()
    },
  }
}