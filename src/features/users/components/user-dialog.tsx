"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import type { User } from "../types"

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  mode: "view" | "edit"
  onEdit?: (user: User) => void
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  mode,
  onEdit,
}: UserDialogProps) {
  if (!user) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "destructive"
      case "admin":
        return "default"
      default:
        return "secondary"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl leading-tight">
            {mode === "edit" ? "编辑用户" : "用户详情"}
          </DialogTitle>
          <DialogDescription>
            用户ID: {user.id}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Basic Info Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">昵称</p>
                <p className="font-medium">{user.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">邮箱</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">角色</p>
                <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">套餐等级</p>
                <Badge variant="outline">{user.tier}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Subscription Info Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">订阅信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">积分余额</p>
                <p className="font-medium font-mono">
                  {user.pointsBalance.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">聊天次数</p>
                <p className="font-medium font-mono">
                  {user.chatQuotaUsed} / {user.chatQuotaTotal}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">状态</p>
                <Badge
                  variant={
                    user.status === "active"
                      ? "default"
                      : user.status === "pending"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {user.status}
                </Badge>
              </div>
              {user.subscriptionExpiredAt && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">到期时间</p>
                  <p className="font-medium">
                    {formatDate(user.subscriptionExpiredAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Account Info Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">账户信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">注册时间</p>
                <p className="font-medium">{formatDate(user.registeredAt)}</p>
              </div>
              {user.lastLoginAt && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">最后登录</p>
                  <p className="font-medium">{formatDate(user.lastLoginAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-4">
          {mode === "view" && onEdit && (
            <Button
              onClick={() => onEdit(user)}
              className="cursor-pointer"
            >
              编辑用户
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}