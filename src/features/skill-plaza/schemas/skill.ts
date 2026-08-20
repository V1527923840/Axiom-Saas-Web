/**
 * Skill Plaza — Zod schemas for upload forms.
 *
 * 浏览器端 preflight 校验:把 Saas-Server 的服务端校验提前到 UI,
 * 减少一次往返。后端仍然是 authoritative source of truth。
 */
import { z } from "zod"

export const skillCodeSchema = z
  .string()
  .min(2, "code 至少 2 字符")
  .max(64, "code 不超过 64 字符")
  .regex(/^[a-z0-9_-]+$/, "code 只能含小写字母、数字、下划线、横线")

export const skillNameSchema = z
  .string()
  .min(1, "name 必填")
  .max(128, "name 不超过 128 字符")

export const skillDescriptionSchema = z
  .string()
  .min(10, "description 至少 10 字符")
  .max(500, "description 不超过 500 字符")

export const skillChangelogSchema = z
  .string()
  .max(500, "changelog 不超过 500 字符")
  .optional()

// 上传 Phase 2 的 body — code 字段已不再由 UI 填写,后端从 name + hash 自己派生。
// 仍允许 UI 显式传入(向后兼容老客户端 / 高级用例),所以这里用 optional。
export const confirmSkillContentFormSchema = z.object({
  code: skillCodeSchema.optional(),
  name: skillNameSchema,
  description: skillDescriptionSchema,
  changelog: skillChangelogSchema,
  category: z.string().max(64).optional(),
})

export type ConfirmSkillContentForm = z.infer<
  typeof confirmSkillContentFormSchema
>

// Phase 1 的 body
export const createUploadUrlFormSchema = z.object({
  filename: z.string().min(1).max(256),
  size: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024, "zip 不能超过 50 MB"),
  sourceFormat: z.enum(["md", "zip"]),
  hash: z.string().regex(/^[a-f0-9]{64}$/, "hash 必须是 sha256 (64 hex)"),
})

export type CreateUploadUrlForm = z.infer<typeof createUploadUrlFormSchema>

// frontmatter 校验
export const skillFrontmatterSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().min(10).max(500),
  category: z.string().max(64).optional(),
  tags: z.array(z.string()).optional(),
  files_index: z
    .array(
      z.object({
        path: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .optional(),
})

export type SkillFrontmatterInput = z.infer<typeof skillFrontmatterSchema>