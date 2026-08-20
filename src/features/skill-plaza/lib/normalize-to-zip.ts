/**
 * Skill Plaza — normalize a single .md or pre-built .zip into the canonical
 * zip blob the backend expects.
 *
 * Backend (skill-upload.service.ts) accepts ONLY:
 *   - application/zip
 *   - Contains SKILL.md at <slug>/SKILL.md (spec §2.1)
 *   - <slug>/{references,templates,examples,assets}/ for content subdirs
 *   - <slug>/tools/*.json for tool schema
 *
 * Single .md → zip with new <slug>/SKILL.md layout
 * Pre-built .zip → pass through (validate client-side per spec §3.3)
 */
import JSZip from "jszip"
import { sha256 } from "./frontmatter"
import { parseSkillMd } from "./frontmatter"

export interface NormalizedZip {
  blob: Blob
  hash: string
  sourceFormat: "md" | "zip"
  // 解析出来的 frontmatter (单 .md 模式)
  parsed?: ReturnType<typeof parseSkillMd>
}

// ─── spec §3.3 前端校验常量 ──────────────────────────────────────────
// slug: 与 spec §2.2 一致的小写-数字-短横线形式
const SLUG_RE = /^[a-z0-9-]{1,60}$/
// 第一层子目录白名单(spec §2.2 限定的 5 个:references/templates/examples/assets/tools)
// tools 单独走 admin-server 的 tool 加载分支,不在 skill_file 白名单里
const ALLOWED_SUBDIRS = [
  "references",
  "templates",
  "examples",
  "assets",
  "tools",
] as const
// 敏感文件黑名单(spec §3.2)
const BLOCKED_RE =
  /(__pycache__|\.pytest_cache|\.egg-info|\.pyc$|pyproject\.toml|setup\.py|\.git\/|\.DS_Store)/

/**
 * 从人类可读的 name + content hash 派生 zip 顶层目录 slug。
 * 逻辑镜像后端 skill-upload.service.ts:deriveCode(),保证前后端 slug 一致:
 *   1) kebab-case(name):保留 ASCII 字母数字,其它字符折成短横线,头尾短横线去掉
 *   2) 切到 48 字符(给后端 hash prefix 留位)
 *   3) 若结果太短(< 2 字符)或全是中文 → fallback `skill-${hash8}`,确保 slug
 *      非空 + 全局唯一
 */
function deriveSlug(name: string, hash: string): string {
  const kebab = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  if (kebab.length >= 2) return kebab
  return `skill-${hash.slice(0, 8)}`
}

/**
 * 把单个 .md 包成 spec §2.1 布局的 zip(<slug>/SKILL.md + 4 个白名单子目录 + tools/)。
 * 子目录都是空 folder,让 admin-server 通过白名单校验即可。
 */
function packMdAsZip(md: string, slug: string): JSZip {
  const zip = new JSZip()
  zip.file(`${slug}/SKILL.md`, md)
  zip.folder(`${slug}/references`)
  zip.folder(`${slug}/templates`)
  zip.folder(`${slug}/examples`)
  zip.folder(`${slug}/assets`)
  zip.folder(`${slug}/tools`)
  return zip
}

/**
 * 按 spec §3.3 校验上传的 skill zip。
 *
 * 抛错信息与 spec §3.1 表格对齐,方便联调时前后端契约一致。
 *
 * 注意:category 枚举(spec §3.3 那 8 个英文)刻意不在前端校验 —
 *   前端表单的 PREDEFINED_CATEGORIES 是「宏观 / 行业 / 量化」3 个中文,
 *   与 spec §3.4 表里列的 8 英文不互通;这种业务规则的差异交给后端兜底,
 *   前端只挡结构错误,避免误伤。
 */
export async function validateSkillZip(zip: JSZip): Promise<void> {
  const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir)

  // 1) 顶层只有 1 个目录(spec §3.1)
  const topDirs = [...new Set(paths.map((p) => p.split("/")[0]))]
  if (topDirs.length !== 1) {
    throw new Error("zip 必须只包含一个顶层目录（即 slug 名）")
  }
  const slug = topDirs[0]

  // 2) slug 命名合法(spec §3.1)
  if (!SLUG_RE.test(slug)) {
    throw new Error(`目录名不符合 slug 规则: ${slug}`)
  }

  // 3) SKILL.md 在 <slug>/SKILL.md,不在 zip 根(spec §3.1)
  const skillMd = zip.file(`${slug}/SKILL.md`)
  if (!skillMd) {
    throw new Error("缺少 SKILL.md")
  }

  // 4) 敏感文件黑名单(spec §3.2)— 早 fail,免得后面解析一半被截断
  for (const p of paths) {
    if (BLOCKED_RE.test(p)) {
      throw new Error(`包含被禁止的文件: ${p}`)
    }
  }

  // 5) 第一层子目录白名单(spec §3.1)
  for (const p of paths) {
    if (p === `${slug}/SKILL.md`) continue
    const parts = p.split("/")
    if (parts.length >= 2 && parts[1]) {
      if (!(ALLOWED_SUBDIRS as readonly string[]).includes(parts[1])) {
        throw new Error(
          `子目录 ${parts[1]} 不在白名单内 (允许: ${ALLOWED_SUBDIRS.join(", ")})`,
        )
      }
    }
  }

  // 6) frontmatter 解析 + name == slug(spec §3.1)
  // parseSkillMd 抛出的错误已经包含示例格式和当前文件起始 60 字符,
  // 信息密度比 spec 表格里的「解析失败」高,直接透传不包。
  const text = await skillMd.async("string")
  const parsed = parseSkillMd(text)
  if (parsed.frontmatter.name !== slug) {
    throw new Error(
      `SKILL.md frontmatter.name 与目录名不一致 (期望 ${slug},实际 ${parsed.frontmatter.name})`,
    )
  }
}

export async function normalizeToZip(input: {
  file: File
  format: "md" | "zip"
}): Promise<NormalizedZip> {
  if (input.format === "zip") {
    if (!input.file.name.endsWith(".zip")) {
      throw new Error("zip 模式必须是 .zip 文件")
    }
    // spec §3.3 推荐的前端预校验(spec §3.4 后端兜底)。
    // 校验顺序按 spec §3.3 骨架:顶层目录 → slug → SKILL.md → 黑名单
    // → 白名单 → frontmatter → name==slug。
    const buf = await input.file.arrayBuffer()
    const zip = await JSZip.loadAsync(buf)
    await validateSkillZip(zip)
    const blob = new Blob([buf], { type: "application/zip" })
    const hash = await sha256(new Uint8Array(buf))
    return { blob, hash, sourceFormat: "zip" }
  }

  // 单 .md 模式(spec §2.1 布局:<slug>/SKILL.md + 子目录白名单)
  if (!input.file.name.endsWith(".md")) {
    throw new Error("单 .md 模式必须是 .md 文件")
  }
  const md = await input.file.text()
  const parsed = parseSkillMd(md)
  // slug 派生来源:优先用 frontmatter 的 name(用户上传时通常与 .md 内容一致),
  // fallback 到 .md 文件名(去掉 .md 后缀)
  const baseName =
    parsed.frontmatter.name || input.file.name.replace(/\.md$/i, "")

  // ★ 2-pass 解决 slug 与 zip hash 的循环依赖:
  //   pass 1:用全 0 hash 占位派生 slug,生成 zip,算真实 hash
  //   pass 2:仅当 slug 是 `skill-xxxxxxxx8` 形式的 fallback(纯中文 name 等情况)
  //          才用真实 hash 重打包 — 把 hash 嵌入 slug 让其全局唯一
  // 99% 用户 name 是英文/混合,pass 1 就够,pass 2 不触发。
  const placeholderHash = "0".repeat(64)
  let slug = deriveSlug(baseName, placeholderHash)
  let zip = packMdAsZip(md, slug)
  let buf = await zip.generateAsync({ type: "uint8array" })
  let hash = await sha256(buf)

  const isFallback = /^skill-[a-f0-9]{8}$/.test(slug)
  if (isFallback) {
    slug = deriveSlug(baseName, hash)
    zip = packMdAsZip(md, slug)
    buf = await zip.generateAsync({ type: "uint8array" })
    hash = await sha256(buf)
  }

  const blob = new Blob([new Uint8Array(buf)], { type: "application/zip" })
  return { blob, hash, sourceFormat: "md", parsed }
}