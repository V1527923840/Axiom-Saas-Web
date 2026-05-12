"use client"

import { useEffect, useState, useCallback } from "react"
import { useRoleMenuAssign } from "../hooks/use-role-menu-assign"
import { MenuTree } from "../components/menu-tree"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function MenuAssignPage() {
  const {
    roles,
    selectedRoleId,
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

  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchRoles(),
        fetchMenuTree(),
      ])
      setInitialized(true)
    }
    init()
  }, [fetchRoles, fetchMenuTree])

  const handleRoleChange = useCallback(async (roleId: string) => {
    selectRole(roleId)
    await fetchRoleMenus(roleId)
  }, [selectRole, fetchRoleMenus])

  const handleCheckChange = useCallback((newCheckedKeys: string[]) => {
    setCheckedMenuIds(newCheckedKeys)
  }, [setCheckedMenuIds])

  const handleSave = useCallback(async () => {
    if (!selectedRoleId) {
      toast.error("请先选择角色")
      return
    }

    try {
      await saveRoleMenus(selectedRoleId, checkedMenuIds)
      toast.success("保存成功")
    } catch (err) {
      toast.error("保存失败")
    }
  }, [selectedRoleId, checkedMenuIds, saveRoleMenus])

  const handleReset = useCallback(() => {
    if (selectedRoleId) {
      fetchRoleMenus(selectedRoleId)
    }
  }, [selectedRoleId, fetchRoleMenus])

  const selectedRole = roles.find((r) => r.id === selectedRoleId)

  return (
    <BaseLayout title="菜单权限分配" description="为不同角色分配菜单访问权限">
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        {/* Role Selection */}
        <Card>
          <CardHeader>
            <CardTitle>选择角色</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedRoleId}
              onValueChange={handleRoleChange}
            >
              <SelectTrigger className="w-[280px] cursor-pointer">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRole && (
              <p className="mt-2 text-sm text-muted-foreground">
                当前角色：{selectedRole.name} - {selectedRole.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Menu Tree */}
        <Card>
          <CardHeader>
            <CardTitle>菜单权限</CardTitle>
          </CardHeader>
          <CardContent>
            {!initialized ? (
              <div className="flex items-center justify-center h-32">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedRoleId ? (
              <div className="max-h-[400px] overflow-y-auto">
                <MenuTree
                  menus={menuTree}
                  checkedKeys={checkedMenuIds}
                  onCheckChange={handleCheckChange}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                请先选择一个角色
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {selectedRoleId && (
          <div className="flex justify-end gap-2">
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
          </div>
        )}
      </div>
    </BaseLayout>
  )
}