'use client'

import { ChevronRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BreadcrumbProps {
  path: string
  onNavigate: (path: string) => void
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const segments = path.split('/').filter(Boolean)

  const handleClick = (index: number) => {
    if (index === -1) {
      onNavigate('/')
    } else {
      const newPath = '/' + segments.slice(0, index + 1).join('/') + '/'
      onNavigate(newPath)
    }
  }

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => handleClick(-1)}
      >
        <Home className="h-4 w-4" />
      </Button>

      {segments.map((segment, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 font-normal"
            onClick={() => handleClick(index)}
          >
            {segment}
          </Button>
        </div>
      ))}
    </div>
  )
}