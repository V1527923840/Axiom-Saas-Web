import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserCellProps {
  user: {
    name: string
    email: string
  }
  className?: string
}

export function UserCell({ user, className }: UserCellProps) {
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || "??"

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="font-medium text-sm">{user.name || "未知用户"}</span>
        <span className="text-xs text-muted-foreground">{user.email || "-"}</span>
      </div>
    </div>
  )
}