"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useRoleMenuAssign } from "./hooks/use-role-menu-assign"
import { MenuTree } from "../menus/components/menu-tree"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import type { Role, MenuTreeNode } from "../menus/types"

/**
 * Generate a short, URL-safe role code of the form `role_<ts36><rand36>`.
 *
 * We don't translate the role name because most operator-entered
 * names here are Chinese (e.g. "内容编辑"), which would need a
 * transliteration step we don't want in the UI. A timestamp-plus-rand
 * suffix is universal, sortable by creation time, and avoids
 * collision within the same millisecond thanks to the random tail.
 *
 * The backend's `CreateRoleDto.code` is treated as opaque — any
 * non-empty string the operator-side code generator owns will do, and
 * we surface it read-only on the dialog so the operator can copy it
 * (e.g. into API scripts) but cannot modify it.
 */
function generateRoleCode(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `role_${ts}${rand}`
}

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
    createRole,
    deleteRole,
    selectRole,
    setCheckedMenuIds,
  } = useRoleMenuAssign()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentRole, setCurrentRole] = useState<Role | null>(null)

  // Add-role dialog state — three fields matching `CreateRoleDto`.
  // We keep the dialog state local to the page because only the page
  // actually triggers the action; the hook's `createRole` is the
  // network layer and stays unaware of the form.
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
  })
  // The role code is auto-generated and shown read-only. Operators can
  // no longer type into a code input, which removes a class of
  // whitespace-only / duplicate-code / accidentally-pasted mistakes.
  // The backend's `CreateRoleDto.code` is still required, so we fill
  // it ourselves right before the POST.
  const [generatedCode, setGeneratedCode] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Delete-confirm state — single dialog reused for whichever row
  // the operator targeted, so the parent owns the "currently-being-
  // deleted" pointer rather than spawning a dialog per row.
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [rolePendingDelete, setRolePendingDelete] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openCreateDialog = useCallback(() => {
    setCreateForm({ name: "", description: "" })
    setGeneratedCode(generateRoleCode())
    setCreateError(null)
    setCreateDialogOpen(true)
  }, [])

  const handleCreateSubmit = useCallback(async () => {
    const name = createForm.name.trim()
    const description = createForm.description.trim() || undefined
    if (!name) {
      setCreateError("请填写角色名称")
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      await createRole({ name, code: generatedCode, description })
      toast.success(`已创建角色 ${name}`)
      setCreateDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误"
      setCreateError(message)
      toast.error(`创建失败: ${message}`)
    } finally {
      setCreating(false)
    }
  }, [createForm, createRole, generatedCode])

  const openDeleteConfirm = useCallback((role: Role) => {
    setRolePendingDelete(role)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!rolePendingDelete) return
    setDeleting(true)
    try {
      await deleteRole(String(rolePendingDelete.id))
      toast.success(`已删除角色 ${rolePendingDelete.name}`)
      setRolePendingDelete(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误"
      toast.error(`删除失败: ${message}`)
    } finally {
      setDeleting(false)
    }
  }, [deleteRole, rolePendingDelete])

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

  // "全选" toggle — replaces the old 重置 button. Walks the entire
  // menu tree to collect every menu id (including nested children),
  // then either fills `checkedMenuIds` with all of them when anything
  // is unchecked, or clears it back to empty when everything is
  // already checked. The flip-without-network design means the operator
  // can quickly preview "if I save with everything enabled" without
  // round-tripping the server.
  const collectAllMenuIds = useCallback((nodes: MenuTreeNode[]): string[] => {
    const ids: string[] = []
    for (const node of nodes) {
      ids.push(node.id)
      if (node.children && node.children.length > 0) {
        ids.push(...collectAllMenuIds(node.children))
      }
    }
    return ids
  }, [])

  const isAllSelected = useMemo(() => {
    if (!menuTree || menuTree.length === 0) return false
    const allIds = collectAllMenuIds(menuTree)
    if (allIds.length === 0) return false
    if (checkedMenuIds.length !== allIds.length) return false
    const set = new Set(checkedMenuIds)
    return allIds.every((id) => set.has(id))
  }, [menuTree, checkedMenuIds, collectAllMenuIds])

  const handleToggleSelectAll = useCallback(() => {
    if (!menuTree || menuTree.length === 0) return
    if (isAllSelected) {
      setCheckedMenuIds([])
    } else {
      setCheckedMenuIds(collectAllMenuIds(menuTree))
    }
  }, [menuTree, isAllSelected, setCheckedMenuIds, collectAllMenuIds])

  return (
    <BaseLayout title="角色管理" description="管理系统角色和角色菜单权限">
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>角色列表</CardTitle>
            <Button onClick={openCreateDialog} className="cursor-pointer">
              添加角色
            </Button>
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
                      <th className="text-left py-3 px-4 font-medium">描述</th>
                      <th className="text-right py-3 px-4 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{role.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {role.description || "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignMenus(role)}
                              className="cursor-pointer"
                            >
                              分配菜单
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteConfirm(role)}
                              className="cursor-pointer text-destructive hover:text-destructive"
                            >
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add-Role Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>添加角色</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="role-name" className="text-xs">
                  角色名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="role-name"
                  placeholder="例:内容编辑"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="role-code" className="text-xs">
                  角色代码 <span className="text-muted-foreground">(自动生成,不可修改)</span>
                </Label>
                {/* Read-only display — the operator can copy this
                    value (e.g. into API scripts) but `readOnly` keeps
                    the field truly unmodifiable and prevents input
                    events from feeding it back into the form state. */}
                <Input
                  id="role-code"
                  value={generatedCode}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  autoComplete="off"
                  className="bg-muted cursor-not-allowed font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="role-description" className="text-xs">
                  描述
                </Label>
                <Textarea
                  id="role-description"
                  placeholder="角色的职责描述"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
              {createError && (
                <p className="text-sm text-destructive" role="alert">
                  {createError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
                className="cursor-pointer"
              >
                取消
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={creating}
                className="cursor-pointer"
              >
                {creating ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="删除角色"
          description={`确定要删除角色 "${rolePendingDelete?.name}" 吗？此操作不可撤销（hard-delete，没有回收站）。`}
          confirmText={deleting ? "删除中..." : "删除"}
          onConfirm={confirmDelete}
          variant="destructive"
        />

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
                onClick={handleToggleSelectAll}
                disabled={saving}
                className="cursor-pointer"
              >
                {isAllSelected ? "反选" : "全选"}
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
