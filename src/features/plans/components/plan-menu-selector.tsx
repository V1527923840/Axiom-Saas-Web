"use client"

import type { MenuTreeNode } from "@/features/menus/types"
import { MenuCheckboxTree } from "@/features/menus/components/menu-checkbox-tree"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

interface PlanMenuSelectorProps {
  menus: MenuTreeNode[]
  value: string[]
  onChange: (menuIds: string[]) => void
  disabled?: boolean
}

// Get all menu IDs from tree (including all nested children)
function getAllMenuIds(menus: MenuTreeNode[]): string[] {
  const ids: string[] = []
  menus.forEach((menu) => {
    ids.push(menu.id)
    if (menu.children && menu.children.length > 0) {
      ids.push(...getAllMenuIds(menu.children))
    }
  })
  return ids
}

export function PlanMenuSelector({ menus, value, onChange, disabled }: PlanMenuSelectorProps) {
  const handleSelectAll = () => {
    const allIds = getAllMenuIds(menus)
    onChange(allIds)
  }

  const handleClearAll = () => {
    onChange([])
  }

  const selectedCount = value.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          已选择 <span className="font-medium text-foreground">{selectedCount}</span> 个菜单
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={disabled}
            className="cursor-pointer"
          >
            <Check className="size-3 mr-1" />
            全选
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={disabled}
            className="cursor-pointer"
          >
            清除
          </Button>
        </div>
      </div>

      <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
        {menus.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            暂无可用菜单
          </div>
        ) : (
          <MenuCheckboxTree
            menus={menus}
            selectedIds={value}
            onChange={onChange}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  )
}
