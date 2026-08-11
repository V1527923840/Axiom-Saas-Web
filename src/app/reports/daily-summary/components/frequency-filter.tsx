import { Button } from "@/components/ui/button"
import type { Frequency } from "@/services/daily-summary"

const OPTIONS: { label: string; value: Frequency | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
]

export function FrequencyFilter({
  value,
  onChange,
}: {
  value: Frequency | undefined
  onChange: (v: Frequency | undefined) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map((o) => (
        <Button
          key={o.label}
          size="sm"
          variant={value === o.value ? "default" : "outline"}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}
