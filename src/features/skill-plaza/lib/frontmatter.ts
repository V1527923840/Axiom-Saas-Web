/**
 * Skill Plaza — frontmatter parser (浏览器侧预校验)。
 *
 * 之前用 gray-matter v4,但其 `toBuffer()` 在浏览器里调 `Buffer.from()`,
 * 没有 Buffer 全局时会抛 "Buffer is not defined"。这里改用纯浏览器实现:
 *
 *   1. 预处理:剥 BOM、剥首部空白、统一换行
 *   2. 正则切分 `---<NL>YAML<NL>---<NL>body`
 *   3. YAML 块用 js-yaml 解析(纯 JS,无 Node 依赖)
 *
 * 校验规则与后端 `FrontmatterValidator` 保持一致(name 1-128, description
 * 10-500)。version 字段已废弃 — Skill 表是 unversioned。
 * 后端仍然是 authoritative source of truth。
 */
import yaml from "js-yaml"
import type { ParsedSkillMd } from "../types"

// 匹配 `---<newline>YAML<newline>---<newline>body`。
// `\r?\n` 容忍 CRLF;body 用 `[\s\S]*` 兜底任意字符(含空)。
// 闭 delimiter 允许没有 trailing newline(有些编辑器不补)。
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

/**
 * 一个完整的、合法 SKILL.md 范例 — 错误信息里展示给用户看。
 */
const EXAMPLE_SKILL_MD = `---
name: 财报基础
description: 阅读财报的基础技能,涵盖三大报表的勾稽关系。
category: 量化
tags:
  - finance
  - accounting
files_index:
  - path: files/principles.md
    description: 详细原则
---

# body 内容写在这里`

export function parseSkillMd(md: string): ParsedSkillMd {
  if (typeof md !== "string") {
    throw new Error("frontmatter: input must be a string")
  }
  // ★ 预处理:剥 BOM(Windows Notepad 经常带)+ 剥首部空白
  const cleaned = md.replace(/^﻿/, "").replace(/^\s+/, "")
  const m = FRONTMATTER_RE.exec(cleaned)
  if (!m) {
    const preview = cleaned.slice(0, 60).replace(/\n/g, "\\n")
    throw new Error(
      `SKILL.md 缺少或格式错误的 frontmatter。需要在文件最顶部以三连短横 \`---\` 开头,包含 name / description 两个必填字段,再以 \`---\` 结束。\n` +
        `示例格式:\n${EXAMPLE_SKILL_MD}\n\n` +
        `当前文件起始 60 字符: "${preview}"`,
    )
  }

  let fm: Record<string, unknown>
  try {
    // jsYaml.load 返回 `unknown`;前端我们只读自己定义的字段,所以 cast 到 Record 即可。
    // 用 JSON schema 关掉 yaml 特有的危险类型(!!js/function、!!python/object …)以防
    // 恶意 md 注入原型链。
    fm = (yaml.load(m[1], {
      schema: yaml.JSON_SCHEMA,
    }) ?? {}) as Record<string, unknown>
  } catch (e) {
    throw new Error(`frontmatter YAML 解析失败: ${(e as Error).message}`)
  }

  // 与后端 FrontmatterValidator 校验规则一致
  if (!fm.name || typeof fm.name !== "string") {
    throw new Error(
      `frontmatter.name 必填 (1-128 字符)。当前值: ${JSON.stringify(fm.name)}`,
    )
  }
  if (fm.name.length > 128) {
    throw new Error(`frontmatter.name 不超过 128 字符 (当前 ${fm.name.length})`)
  }
  if (
    !fm.description ||
    typeof fm.description !== "string" ||
    fm.description.length < 10
  ) {
    throw new Error(
      `frontmatter.description 必填,长度 10-500 字符。当前值: ${JSON.stringify(fm.description)?.slice(0, 80)}`,
    )
  }
  if (fm.description.length > 500) {
    throw new Error(
      `frontmatter.description 不超过 500 字符 (当前 ${fm.description.length})`,
    )
  }
  // ★ 2026-08-18:version 字段已废弃。Skill 表是 unversioned,
  // upload 是 idempotent overwrite — 不再需要 skill 版本号。
  // 老 .md 文件里残留的 `version: N` 字段被默默忽略。

  return {
    frontmatter: {
      name: fm.name,
      description: fm.description,
      category: typeof fm.category === "string" ? fm.category : undefined,
      tags: Array.isArray(fm.tags)
        ? (fm.tags.filter((t) => typeof t === "string") as string[])
        : undefined,
      files_index: Array.isArray(fm.files_index)
        ? (fm.files_index
            .map((f) => {
              if (!f || typeof f !== "object") return null
              const o = f as Record<string, unknown>
              return typeof o.path === "string"
                ? {
                    path: o.path,
                    description:
                      typeof o.description === "string"
                        ? o.description
                        : undefined,
                  }
                : null
            })
            .filter(Boolean) as Array<{ path: string; description?: string }>)
        : [],
    },
    body: m[2],
    raw: md,
  }
}

/**
 * 计算字符串的 sha256 (浏览器侧)。
 *
 * 浏览器侧直接用 SubtleCrypto,避免引入额外库。
 */
export async function sha256(
  input: string | ArrayBuffer | Uint8Array,
): Promise<string> {
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