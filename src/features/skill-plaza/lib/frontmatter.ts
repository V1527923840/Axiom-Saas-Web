/**
 * Skill Plaza — frontmatter parser (浏览器侧预校验)。
 *
 * 后端用 gray-matter (`Axiom-Saas-Server/src/skills/infrastructure/frontmatter/`) ,
 * 这里用同样 API 在上传前先解析给用户预览,以及拒绝明显不合规的 zip。
 *
 * 如果后端升级 frontmatter 校验规则,这里需要同步。
 */
import matter from "gray-matter"
import type { ParsedSkillMd, SkillFrontmatter } from "../types"

export function parseSkillMd(md: string): ParsedSkillMd {
  let parsed: matter.GrayMatterFile<string>
  try {
    parsed = matter(md)
  } catch (e) {
    throw new Error(
      `invalid frontmatter: ${(e as Error).message}`,
    )
  }

  const fm = parsed.data as Partial<SkillFrontmatter>
  if (!fm.name || typeof fm.name !== "string") {
    throw new Error("frontmatter.name 必填 (1-128 字符)")
  }
  if (
    !fm.description ||
    typeof fm.description !== "string" ||
    fm.description.length < 10
  ) {
    throw new Error("frontmatter.description 必填 (10-500 字符)")
  }
  if (!fm.version || typeof fm.version !== "number") {
    throw new Error("frontmatter.version 必填 (number)")
  }

  return {
    frontmatter: {
      name: fm.name,
      description: fm.description,
      category: fm.category,
      tags: fm.tags,
      version: fm.version,
      files_index: fm.files_index ?? [],
    },
    body: parsed.content,
    raw: md,
  }
}

/**
 * 计算字符串的 sha256 (浏览器侧)。
 *
 * 浏览器侧直接用 SubtleCrypto,避免引入额外库。
 */
export async function sha256(input: string | ArrayBuffer | Uint8Array): Promise<string> {
  let data: ArrayBuffer
  if (typeof input === "string") {
    data = new TextEncoder().encode(input).buffer as ArrayBuffer
  } else if (input instanceof Uint8Array) {
    data = input.buffer as ArrayBuffer
  } else {
    data = input
  }
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}