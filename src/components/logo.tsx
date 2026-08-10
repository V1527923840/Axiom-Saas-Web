import * as React from "react"
import { siteConfig } from "@/config/site"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

/**
 * Axiom 站点统一 Logo：几何 "A" 标志。
 * 通过 `currentColor` 着色，可适配亮/暗主题与按钮背景。
 */
export function Logo({ size = 24, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`${siteConfig.name} logo`}
      className={className}
      {...props}
    >
      <title>{siteConfig.name}</title>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 2.5L2.5 29.5H7.7L9.55 25.4H22.45L24.3 29.5H29.5L16 2.5ZM16 11L19.85 19.5H12.15L16 11Z"
        fill="currentColor"
      />
    </svg>
  )
}

interface LogoLockupProps {
  /** 文本相对图标的位置 */
  orientation?: "horizontal" | "vertical"
  /** 图标尺寸 */
  iconSize?: number
  className?: string
}

/**
 * Axiom 站点统一标识：图标 + 文字组合。
 * 适合顶部导航、Footer、登录页等需要同时展示图标与品牌名的位置。
 */
export function LogoLockup({
  orientation = "horizontal",
  iconSize = 24,
  className,
}: LogoLockupProps) {
  return (
    <span
      className={
        orientation === "vertical"
          ? `inline-flex flex-col items-center gap-2 font-semibold ${className ?? ""}`
          : `inline-flex items-center gap-2 font-semibold ${className ?? ""}`
      }
    >
      <Logo size={iconSize} />
      <span>{siteConfig.name}</span>
    </span>
  )
}
