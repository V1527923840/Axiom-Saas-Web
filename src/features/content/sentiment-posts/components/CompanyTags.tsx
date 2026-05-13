"use client"

import { Badge } from "@/components/ui/badge"
import type { Company } from "../types"

interface CompanyTagsProps {
  companies: Company[]
}

export function CompanyTags({ companies }: CompanyTagsProps) {
  if (!companies || companies.length === 0) {
    return <span className="text-muted-foreground text-sm">暂无</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {companies.map((company, index) => (
        <Badge key={index} variant="outline" className="text-xs">
          {company.name}
          {company.code && <span className="ml-1 text-muted-foreground">({company.code})</span>}
        </Badge>
      ))}
    </div>
  )
}