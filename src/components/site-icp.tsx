import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

interface SiteIcpProps {
  /**
   * 额外样式控制。当用于固定吸底时可用 `fixed bottom-0 inset-x-0`。
   */
  className?: string
}

/**
 * 站点 ICP 备案号展示。
 *
 * 用于没有完整 SiteFooter 的页面（如独立 auth、error 页面等）。
 * 内部页面统一走 SiteFooter；其它页面可用此组件保持统一管理。
 */
export function SiteIcp({ className }: SiteIcpProps) {
  return (
    <div
      className={cn(
        "text-center text-xs text-muted-foreground",
        className,
      )}
    >
      <a
        href={siteConfig.icp.recordUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="hover:text-primary"
      >
        {siteConfig.icp.recordNumber}
      </a>
    </div>
  )
}
