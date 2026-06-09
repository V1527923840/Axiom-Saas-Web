/**
 * OSS URL helpers
 *
 * 后端统一返回新格式 image_urls / original_text_raw：
 *   - 已是完整 URL (http://... / https://...) —— 原样用
 *   - 相对路径 (source/zsxq/.../xxx)            —— 拼 {VITE_OSS_BASE_URL} 前缀
 *
 * VITE_OSS_BASE_URL 是 bucket 根（如 http://localhost:9000/saas），
 * 不包含 /source/zsxq 前缀。
 */

const RAW_OSS_BASE_URL = (import.meta.env.VITE_OSS_BASE_URL || "").trim()

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "").replace(/%2F/gi, "/")
}

const OSS_BASE_URL = normalizeBase(RAW_OSS_BASE_URL)

/**
 * 把图片地址转成可在浏览器中直接访问的完整 URL。
 *  - 已是 http(s):// 开头：原样返回
 *  - source/... 相对路径：拼上 {OSS_BASE_URL}
 *  - 其它 / 未配置 base：原样返回
 */
export function toFullImageUrl(path: string | null | undefined): string {
  if (!path) return ""
  if (/^https?:\/\//i.test(path)) return path
  if (!OSS_BASE_URL) return path
  if (path.startsWith("source/")) {
    return `${OSS_BASE_URL}/${path}`
  }
  return path
}

/**
 * 把 markdown 文本里的 ![alt](source/...) 图片引用替换成完整 URL。
 */
export function processMarkdownImages(content: string): string {
  if (!content) return ""
  if (!OSS_BASE_URL) return content

  return content.replace(
    /!\[([^\]]*)\]\((source\/[^)]+)\)/gu,
    (_, alt: string, p: string) => `![${alt}](${OSS_BASE_URL}/${p})`,
  )
}

export const _ossConfig = {
  baseUrl: OSS_BASE_URL,
  isConfigured: OSS_BASE_URL.length > 0,
}
