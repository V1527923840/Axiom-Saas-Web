/**
 * SkillThumbnail — square thumbnail with first-letter fallback.
 *
 * 真实 thumbnail_url 走 OSS 公开读(url = thumbnail_url 直接渲染);
 * 缺图时显示首字母占位卡。
 */
import { cn } from "@/lib/utils"

interface SkillThumbnailProps {
  src?: string | null
  name: string
  className?: string
}

export function SkillThumbnail({ src, name, className }: SkillThumbnailProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "aspect-square w-full rounded-md object-cover",
          className,
        )}
      />
    )
  }
  const initial = name.trim().charAt(0).toUpperCase() || "S"
  return (
    <div
      className={cn(
        "flex aspect-square w-full items-center justify-center rounded-md bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-3xl font-semibold text-foreground",
        className,
      )}
    >
      {initial}
    </div>
  )
}