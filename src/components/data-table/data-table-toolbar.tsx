import { SearchIcon, PlusIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FilterOption } from "./types"

interface DataTableToolbarProps {
  searchPlaceholder?: string
  filters?: FilterOption[]
  selectedFilter?: string
  onFilterChange?: (value: string) => void
  onSearch?: (value: string) => void
  showCreateButton?: boolean
  onCreate?: () => void
  createLabel?: string
}

export function DataTableToolbar({
  searchPlaceholder = "搜索...",
  filters = [],
  selectedFilter,
  onFilterChange,
  onSearch,
  showCreateButton = false,
  onCreate,
  createLabel = "新建",
}: DataTableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={searchPlaceholder}
          className="pl-9"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>

      {filters.length > 0 && onFilterChange && (
        <Select
          value={selectedFilter}
          onValueChange={onFilterChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            {filters.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showCreateButton && onCreate && (
        <Button onClick={onCreate}>
          <PlusIcon className="mr-2 size-4" />
          {createLabel}
        </Button>
      )}
    </div>
  )
}