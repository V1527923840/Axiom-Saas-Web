// re-export shared types so feature-local imports stay flat:
//   import type { Skill, SkillFile } from '@/features/skill-plaza/types'
export * from "../../../types/skill"

// -------- 上传 Hook 输入/输出 --------
import type { UploadSourceFormat } from "../../../types/skill"

export interface SkillUploadInput {
  file: File
  format: UploadSourceFormat
}

export interface SkillUploadPhase1Result {
  uploadUrl: string
  key: string
  skillId: string
  cdnUrl: string
}

export interface SkillUploadPhase2Input {
  skillId: string
  ossKey: string
  hash: string
  sourceFormat: UploadSourceFormat
  code: string
  name: string
  description: string
  changelog?: string
}

export interface SkillUploadResult {
  skillId: string
  version: number
  filesCount: number
  toolsCount: number
}

// -------- Frontmatter 解析结果 --------
export interface SkillFrontmatter {
  name: string
  description: string
  category?: string
  tags?: string[]
  version: number
  files_index?: Array<{
    path: string
    description?: string
  }>
}

export interface ParsedSkillMd {
  frontmatter: SkillFrontmatter
  body: string
  raw: string
}