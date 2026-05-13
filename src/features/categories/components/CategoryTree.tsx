"use client"

import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react"
import { useState } from "react"
import type { CategoryTreeNode } from "../types"

interface CategoryTreeProps {
  nodes: CategoryTreeNode[]
  selectedId?: string
  onSelect: (node: CategoryTreeNode) => void
}

export function CategoryTree({ nodes, selectedId, onSelect }: CategoryTreeProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <CategoryTreeItem
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          level={0}
        />
      ))}
    </div>
  )
}

interface CategoryTreeItemProps {
  node: CategoryTreeNode
  selectedId?: string
  onSelect: (node: CategoryTreeNode) => void
  level: number
}

function CategoryTreeItem({ node, selectedId, onSelect, level }: CategoryTreeItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedId === node.id

  const layerColors: Record<string, string> = {
    carrier: "bg-blue-100 text-blue-800",
    info_type: "bg-purple-100 text-purple-800",
    financial: "bg-green-100 text-green-800",
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
          isSelected ? "bg-primary/10" : "hover:bg-muted"
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-0.5 hover:bg-muted rounded cursor-pointer"
          >
            {expanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {expanded ? (
          <FolderOpen className="size-4 text-muted-foreground" />
        ) : (
          <Folder className="size-4 text-muted-foreground" />
        )}

        <span className="flex-1 font-medium">{node.name}</span>

        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${layerColors[node.layer] || ""}`}>
          {node.layer}
        </span>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}