"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRoleMenuAssign } from "./hooks/use-role-menu-assign"
import { MenuTree } from "../menus/components/menu-tree"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import type { Role } from "../menus/types"

export default function RolesPage() {
  useAuth() // Ensure auth context is available
  const {
    roles,
    menuTree,
    checkedMenuIds,
    saving,
    fetchRoles,
    fetchMenuTree,
    fetchRoleMenus,
    saveRoleMenus,
    selectRole,
    setCheckedMenuIds,
  } = useRoleMenuAssign()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentRole, setCurrentRole] = useState<Role | null>(null)

  // Initial fetch - only on mount with ref guard for React StrictMode
  const initialized = useRef(false)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      Promise.all([
        fetchRoles(),
        fetchMenuTree(),
      ])
    }
  }, [fetchRoles, fetchMenuTree])

  const handleAssignMenus = useCallback(async (role: Role) => {
    setCurrentRole(role)
    selectRole(role.id)
    await fetchRoleMenus(role.id)
    setDialogOpen(true)
  }, [selectRole, fetchRoleMenus])

  const handleCheckChange = useCallback((newCheckedKeys: string[]) => {
    setCheckedMenuIds(newCheckedKeys)
  }, [setCheckedMenuIds])

  const handleSave = useCallback(async () => {
    if (!currentRole) {
      toast.error("请先选择角色")
      return
    }

    try {
      await saveRoleMenus(currentRole.id, checkedMenuIds)
      toast.success("保存成功")
      setDialogOpen(false)
    } catch (err) {
      toast.error("保存失败")
    }
  }, [currentRole, checkedMenuIds, saveRoleMenus])

  const handleReset = useCallback(() => {
    if (currentRole) {
      fetchRoleMenus(currentRole.id)
    }
  }, [currentRole, fetchRoleMenus])

  return (
    <BaseLayout title="角色管理" description="管理系统角色和角色菜单权限">
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>角色列表</CardTitle>
          </CardHeader>
          <CardContent>
            {!initialized ? (
              <div className="flex items-center justify-center h-32">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">角色名称</th>
                      <th className="text-left py-3 px-4 font-medium">角色代码</th>
                      <th className="text-left py-3 px-4 font-medium">描述</th>
                      <th className="text-right py-3 px-4 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{role.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{role.code}</Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {role.description || "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssignMenus(role)}
                            className="cursor-pointer"
                          >
                            分配菜单
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Menu Assignment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                分配菜单 - {currentRole?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              {dialogOpen && (
                <MenuTree
                  menus={menuTree}
                  checkedKeys={checkedMenuIds}
                  onCheckChange={handleCheckChange}
                />
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
                className="cursor-pointer"
              >
                重置
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="cursor-pointer"
              >
                {saving ? "保存中..." : "保存分配"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BaseLayout>
  )
}