import { Button } from '@/components/ui/button'

export function SourcesButton({
  count,
  onClick,
  expanded,
}: {
  count: number
  onClick: () => void
  expanded?: boolean
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={expanded ?? false}
    >
      查看来源 ({count}) →
    </Button>
  )
}
