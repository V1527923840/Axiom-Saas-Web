/**
 * Skill Plaza — normalize a single .md or pre-built .zip into the canonical
 * zip blob the backend expects.
 *
 * Backend (skill-upload.service.ts) accepts ONLY:
 *   - application/zip
 *   - Contains SKILL.md at root
 *   - files/ subdir for references
 *   - files/tools/ for declarative tool JSON
 *
 * Single .md → zip(SKILL.md + empty files/ + empty files/tools/)
 * Pre-built .zip → pass through (validate client-side)
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

export async function normalizeToZip(input: {
  file: File
  format: "md" | "zip"
}): Promise<NormalizedZip> {
  if (input.format === "zip") {
    if (!input.file.name.endsWith(".zip")) {
      throw new Error("zip 模式必须是 .zip 文件")
    }
    // 信任上传者的 zip — 但要做最小校验:含 SKILL.md
    const buf = await input.file.arrayBuffer()
    const zip = await JSZip.loadAsync(buf)
    const skillMd = zip.file("SKILL.md")
    if (!skillMd) {
      throw new Error("zip 必须包含 SKILL.md")
    }
    const blob = new Blob([buf], { type: "application/zip" })
    const hash = await sha256(new Uint8Array(buf))
    return { blob, hash, sourceFormat: "zip" }
  }

  // 单 .md 模式
  if (!input.file.name.endsWith(".md")) {
    throw new Error("单 .md 模式必须是 .md 文件")
  }
  const md = await input.file.text()
  const parsed = parseSkillMd(md)

  const zip = new JSZip()
  zip.file("SKILL.md", md)
  zip.folder("files")
  zip.folder("files/tools")

  const buf = await zip.generateAsync({ type: "uint8array" })
  const blob = new Blob([new Uint8Array(buf)], { type: "application/zip" })
  const hash = await sha256(buf)
  return { blob, hash, sourceFormat: "md", parsed }
}