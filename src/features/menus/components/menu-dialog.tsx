"use client"

import type { Menu, MenuFormValues } from "../types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { MenuForm } from "./menu-form"

interface MenuDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit" | "view"
  menu: Menu | null
  parentMenus: Menu[]
  onSubmit: (values: MenuFormValues) => void
  onDelete?: (menu: Menu) => void
  loading?: boolean
}

export function MenuDialog({
  open,
  onOpenChange,
  mode,
  menu,
  parentMenus,
  onSubmit,
  onDelete,
  loading,
}: MenuDialogProps) {
  const handleSubmit = (values: MenuFormValues) => {
    onSubmit(values)
  }

  const handleDelete = () => {
    if (menu && onDelete) {
      onDelete(menu)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "添加菜单" : mode === "edit" ? "编辑菜单" : "菜单详情"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add" ? "创建一个新的菜单项" : mode === "edit" ? "修改菜单信息" : "查看菜单的完整信息"}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && menu ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">基本信息</h3>
              <Separator className="mb-3" />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">菜单ID</dt>
                <dd className="font-mono text-xs">{menu.id}</dd>

                <dt className="text-muted-foreground">菜单名称</dt>
                <dd className="font-medium">{menu.name}</dd>

                <dt className="text-muted-foreground">菜单编码</dt>
                <dd className="font-mono text-xs">{menu.code}</dd>

                <dt className="text-muted-foreground">图标</dt>
                <dd>{menu.icon || "-"}</dd>

                <dt className="text-muted-foreground">路径</dt>
                <dd className="text-muted-foreground">{menu.path || "-"}</dd>

                <dt className="text-muted-foreground">上级菜单</dt>
                <dd>{menu.parentId ? "有上级" : "顶级菜单"}</dd>

                <dt className="text-muted-foreground">排序</dt>
                <dd className="font-mono">{menu.sortOrder}</dd>

                <dt className="text-muted-foreground">状态</dt>
                <dd>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      menu.status === "active"
                        ? "bg-green-500/20 text-green-700"
                        : "bg-red-500/20 text-red-700"
                    }`}
                  >
                    {menu.status === "active" ? "启用" : "禁用"}
                  </span>
                </dd>
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">时间信息</h3>
              <Separator className="mb-3" />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">创建时间</dt>
                <dd>{menu.createdAt ? new Date(menu.createdAt).toLocaleString("zh-CN") : "-"}</dd>

                <dt className="text-muted-foreground">更新时间</dt>
                <dd>{menu.updatedAt ? new Date(menu.updatedAt).toLocaleString("zh-CN") : "-"}</dd>
              </dl>
            </div>
          </div>
        ) : (
          <MenuForm
            initialData={menu}
            parentMenus={parentMenus}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            loading={loading}
          />
        )}

        <DialogFooter>
          {mode === "view" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                关闭
              </Button>
              {onDelete && (
                <Button variant="destructive" onClick={handleDelete} className="cursor-pointer">
                  删除
                </Button>
              )}
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}