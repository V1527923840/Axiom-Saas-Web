/**
 * useSkillUpload — Phase 1 + Phase 1.5 + Phase 2 orchestrator.
 *
 * 流程 (与后端 SkillUploadService 对应):
 *   1. normalizeToZip(file, format) — 单 .md → zip, 或 .zip 校验
 *   2. POST /skills/upload-url — 拿到 uploadUrl + skillId + key
 *   3. PUT uploadUrl 直传七牛云 (presigned PUT URL)
 *   4. PUT /skills/{id}/content — 提交 hash + 元数据,后端校验
 *
 * 失败行为:每一步失败都会 throw,UI 显示错误后回滚乐观状态。
 */
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import {
  confirmSkillContent,
  createUploadUrl,
  putZipToQiniu,
} from "../services/skill-api"
import { normalizeToZip } from "../lib/normalize-to-zip"
import type {
  ConfirmSkillContentForm,
} from "../schemas/skill"
import type {
  SkillUploadInput,
  SkillUploadResult,
  UploadSourceFormat,
} from "../types"

interface UseSkillUploadOptions {
  onSuccess?: (result: SkillUploadResult) => void
  onError?: (err: Error) => void
}

interface UploadPhase1Input {
  filename: string
  size: number
  sourceFormat: UploadSourceFormat
  hash: string
}

export function useSkillUpload(options: UseSkillUploadOptions = {}) {
  const [progress, setProgress] = useState<0 | 1 | 2 | 3>(0)

  const mutation = useMutation<SkillUploadResult, Error, SkillUploadInput & ConfirmSkillContentForm>({
    mutationFn: async (input: SkillUploadInput & ConfirmSkillContentForm) => {
      // Phase 0 (本地):file → zip blob + sha256
      setProgress(1)
      const normalized = await normalizeToZip(input)

      // Phase 1 (server):申请 uploadUrl
      const phase1Input: UploadPhase1Input = {
        filename: input.file.name.replace(/\.md$|\.zip$/i, "") + ".zip",
        size: normalized.blob.size,
        sourceFormat: normalized.sourceFormat,
        hash: normalized.hash,
      }
      const phase1 = await createUploadUrl(phase1Input)

      // Phase 1.5 (browser → Qiniu):直传 zip
      setProgress(2)
      await putZipToQiniu(phase1.uploadUrl, normalized.blob)

      // Phase 2 (server):确认上传
      setProgress(3)
      const result = await confirmSkillContent(phase1.skillId, {
        ossKey: phase1.key,
        hash: normalized.hash,
        sourceFormat: normalized.sourceFormat,
        code: input.code,
        name: input.name,
        description: input.description,
        changelog: input.changelog,
        category: input.category,
      })

      return {
        skillId: result.skillId,
        version: result.version,
        filesCount: result.filesCount,
        toolsCount: result.toolsCount,
      }
    },
    onSuccess: (result: SkillUploadResult) => {
      setProgress(0)
      options.onSuccess?.(result)
    },
    onError: (err: Error) => {
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