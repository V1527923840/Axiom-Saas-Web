"use client"

import type { MenuTreeNode } from "../types"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronRight, ChevronDown } from "lucide-react"
import { useState } from "react"

interface MenuTreeProps {
  menus: MenuTreeNode[]
  checkedKeys: string[]
  onCheckChange: (checkedKeys: string[]) => void
}

interface MenuTreeItemProps {
  menu: MenuTreeNode
  checkedKeys: string[]
  onCheckChange: (checkedKeys: string[]) => void
  level: number
}

function MenuTreeItem({ menu, checkedKeys, onCheckChange, level }: MenuTreeItemProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = menu.children && menu.children.length > 0
  const isChecked = checkedKeys.includes(menu.id)

  const handleCheck = (checked: boolean) => {
    let newCheckedKeys = [...checkedKeys]

    if (checked) {
      // Add this menu
      if (!newCheckedKeys.includes(menu.id)) {
        newCheckedKeys.push(menu.id)
      }
      // If has children, add all children too
      if (hasChildren) {
        const childIds = getAllChildIds(menu.children!)
        childIds.forEach((id) => {
          if (!newCheckedKeys.includes(id)) {
            newCheckedKeys.push(id)
          }
        })
      }
    } else {
      // Remove this menu
      newCheckedKeys = newCheckedKeys.filter((key) => key !== menu.id)
      // If has children, remove all children too
      if (hasChildren) {
        const childIds = getAllChildIds(menu.children!)
        newCheckedKeys = newCheckedKeys.filter((key) => !childIds.includes(key))
      }
    }

    onCheckChange(newCheckedKeys)
  }

  const handleChildCheckChange = (newKeysFromChild: string[]) => {
    // Simply propagate the child's new state up without re-evaluating parent
    // The parent's checked state is managed by handleCheck
    onCheckChange(newKeysFromChild)
  }

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 py-1">
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-muted rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        <Checkbox
          checked={isChecked}
          onCheckedChange={handleCheck}
          className="cursor-pointer"
        />
        <span className="text-sm">{menu.name}</span>
        <span className="text-xs text-muted-foreground">({menu.code})</span>
      </div>

      {hasChildren && expanded && (
        <div className="ml-6 border-l border-border pl-4">
          {menu.children!.map((child) => (
            <MenuTreeItem
              key={child.id}
              menu={child}
              checkedKeys={checkedKeys}
              onCheckChange={handleChildCheckChange}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function getAllChildIds(children: MenuTreeNode[]): string[] {
  const ids: string[] = []
  children.forEach((child) => {
    ids.push(child.id)
    if (child.children && child.children.length > 0) {
      ids.push(...getAllChildIds(child.children))
    }
  })
  return ids
}

export function MenuTree({ menus, checkedKeys, onCheckChange }: MenuTreeProps) {
  return (
    <div className="space-y-1">
      {menus.map((menu) => (
        <MenuTreeItem
          key={menu.id}
          menu={menu}
          checkedKeys={checkedKeys}
          onCheckChange={onCheckChange}
          level={0}
        />
      ))}
    </div>
  )
}