import { Button } from '@/components/ui/button'

export function SourcesButton({
  count,
  onClick,
}: {
  count: number
  onClick: () => void
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      查看来源 ({count}) →
    </Button>
  )
}
