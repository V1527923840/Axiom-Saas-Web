"use client"

import { Badge } from "@/components/ui/badge"
import type { ClassificationTag } from "../types"

interface ClassificationTagsProps {
  classifications: ClassificationTag[]
}

const layerColors: Record<string, string> = {
  carrier: "bg-blue-100 text-blue-800",
  info_type: "bg-purple-100 text-purple-800",
  financial: "bg-green-100 text-green-800",
}

export function ClassificationTags({ classifications }: ClassificationTagsProps) {
  if (!classifications || classifications.length === 0) {
    return <span className="text-muted-foreground text-sm">暂无</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {classifications.map((classification, index) => (
        <Badge
          key={index}
          className={`text-xs ${layerColors[classification.layer] || "bg-gray-100"}`}
        >
          {classification.name}
        </Badge>
      ))}
    </div>
  )
}