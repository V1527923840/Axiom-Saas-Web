/**
 * Skill Plaza — 预定义分类。
 *
 * 用户在上传 skill 时可从这几个预设里选;管理页面筛选也按这几个
 * + 实际数据中出现的动态分类组合展示。
 *
 * spec §3.5.1: category 是描述 skill 的核心维度,前台把它当作
 * 广场首页的 sidebar filter。
 */
export const PREDEFINED_CATEGORIES = [
  "宏观",
  "行业",
  "量化",
] as const

export type PredefinedCategory = (typeof PREDEFINED_CATEGORIES)[number]

export function isPredefinedCategory(s: string): s is PredefinedCategory {
  return (PREDEFINED_CATEGORIES as readonly string[]).includes(s)
}