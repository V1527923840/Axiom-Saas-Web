"use client"

import type { MenuTreeNode } from "@/features/menus/types"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronRight, ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface MenuCheckboxTreeProps {
  menus: MenuTreeNode[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  disabled?: boolean
}

interface MenuCheckboxTreeItemProps {
  menu: MenuTreeNode
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  level: number
  disabled?: boolean
}

function MenuCheckboxTreeItem({ menu, selectedIds, onChange, level, disabled }: MenuCheckboxTreeItemProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = menu.children && menu.children.length > 0
  const isChecked = selectedIds.includes(menu.id)
  const checkboxRef = useRef<HTMLButtonElement>(null)

  // Calculate if all children are selected (for indeterminate logic)
  const getAllChildIds = (children: MenuTreeNode[]): string[] => {
    const ids: string[] = []
    children.forEach((child) => {
      ids.push(child.id)
      if (child.children && child.children.length > 0) {
        ids.push(...getAllChildIds(child.children))
      }
    })
    return ids
  }

  const allChildIds = hasChildren ? getAllChildIds(menu.children!) : []
  const selectedChildIds = allChildIds.filter((id) => selectedIds.includes(id))
  const isIndeterminate = hasChildren && selectedChildIds.length > 0 && selectedChildIds.length < allChildIds.length

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.dataset.indeterminate = String(isIndeterminate)
    }
  }, [isIndeterminate])

  const handleCheck = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true

    if (!hasChildren) {
      if (isChecked) {
        onChange([...selectedIds, menu.id])
      } else {
        onChange(selectedIds.filter((id) => id !== menu.id))
      }
      return
    }

    let newSelectedIds = [...selectedIds]

    if (isChecked) {
      // Add parent and all children
      newSelectedIds.push(menu.id)
      const childIds = getAllChildIds(menu.children!)
      childIds.forEach((id) => {
        if (!newSelectedIds.includes(id)) {
          newSelectedIds.push(id)
        }
      })
    } else {
      // Remove parent and all children
      newSelectedIds = newSelectedIds.filter((id) => id !== menu.id)
      const childIds = getAllChildIds(menu.children!)
      newSelectedIds = newSelectedIds.filter((id) => !childIds.includes(id))
    }

    onChange(newSelectedIds)
  }

  const handleChildChange = (childSelectedIds: string[]) => {
    // Merge child changes into selectedIds
    let newSelectedIds = selectedIds.filter((id) => !allChildIds.includes(id))

    childSelectedIds.forEach((id) => {
      if (!newSelectedIds.includes(id)) {
        newSelectedIds.push(id)
      }
    })

    onChange(newSelectedIds)
  }

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 py-1">
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-muted rounded transition-colors"
            disabled={disabled}
            type="button"
          >
            {expanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <Checkbox
          ref={checkboxRef}
          checked={isChecked}
          onCheckedChange={handleCheck}
          className="cursor-pointer"
          disabled={disabled}
        />
        <span className="text-sm">{menu.name}</span>
        <span className="text-xs text-muted-foreground">({menu.code})</span>
      </div>

      {hasChildren && expanded && (
        <div className="ml-6 border-l border-border pl-4">
          {menu.children!.map((child) => (
            <MenuCheckboxTreeItem
              key={child.id}
              menu={child}
              selectedIds={selectedIds}
              onChange={handleChildChange}
              level={level + 1}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function MenuCheckboxTree({ menus, selectedIds, onChange, disabled }: MenuCheckboxTreeProps) {
  return (
    <div className="space-y-1">
      {menus.map((menu) => (
        <MenuCheckboxTreeItem
          key={menu.id}
          menu={menu}
          selectedIds={selectedIds}
          onChange={onChange}
          level={0}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
