/**
 * 站点统一配置 — 集中管理品牌名、备案号等全局信息。
 * 任何页面、组件、邮件模板等需要展示站点信息的位置都应从此处读取。
 */
export const siteConfig = {
  /** 品牌名（展示用） */
  name: "Axiom",
  /** 品牌全称（用于 footer / 标题等） */
  fullName: "AXIOM",
  /** 站点根 URL（备案跳转等场景使用） */
  url: "https://axiom.example.com",
  /** 中国大陆 ICP 备案信息 */
  icp: {
    /** 备案号原文，例如：粤ICP备2026072140号 */
    recordNumber: "粤ICP备2026072140号",
    /** 工业和信息化部备案管理系统地址 */
    recordUrl: "https://beian.miit.gov.cn/",
  },
} as const

export type SiteConfig = typeof siteConfig
