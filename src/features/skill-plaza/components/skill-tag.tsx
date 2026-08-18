/**
 * SkillTag — small pill used to show category / tags.
 */
import { Badge } from "@/components/ui/badge"

interface SkillTagProps {
  label: string
  variant?: "default" | "secondary" | "outline"
}

export function SkillTag({ label, variant = "secondary" }: SkillTagProps) {
  return <Badge variant={variant}>{label}</Badge>
}