import type { FilterOption } from "./types"

interface DataTableFiltersProps {
  filters: FilterOption[]
  selectedFilter?: string
  onFilterChange?: (value: string) => void
}

export function DataTableFilters({
  filters,
  selectedFilter,
  onFilterChange,
}: DataTableFiltersProps) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange?.(filter.value)}
          className={`
            inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium
            transition-colors hover:bg-muted
            ${
              selectedFilter === filter.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/20 bg-background text-muted-foreground"
            }
          `}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}