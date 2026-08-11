import type { ReactNode } from "react"
import { TableRow } from "@/components/ui/table"

export function RowTrigger({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <TableRow onClick={onClick} className="cursor-pointer" data-testid="row-trigger">
      {children}
    </TableRow>
  )
}
