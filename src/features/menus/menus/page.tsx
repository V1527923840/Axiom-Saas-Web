"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus } from "lucide-react"
import { useMenus, useMenuTree } from "../hooks/use-menus"
import { MenuDialog } from "../components/menu-dialog"
import { MenuTreeTable } from "../components/menu-tree-table"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import type { Menu, MenuFormValues } from "../types"

export default function MenusPage() {
  const {
    createMenu,
    updateMenu,
    deleteMenu,
  } = useMenus()

  // useMenuTree 自动 cache + 自动 refetch:
  // mutators 的 onSettled 已经 invalidate `['menus', 'tree']`,
  // 增删改后这里不需要手动 refetch。
  const { data: menuTree = [], isLoading: treeLoading } = useMenuTree()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view">("add")
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null)
  const [topLevelMenus, setTopLevelMenus] = useState<Menu[]>([])

  // 树就是顶级菜单(后端 /v1/menus/tree 返回的 root 节点 = parentId: null)
  useEffect(() => {
    setTopLevelMenus(menuTree)
  }, [menuTree])

  const handleView = useCallback((menu: Menu) => {
    setSelectedMenu(menu)
    setDialogMode("view")
    setDialogOpen(true)
  }, [])

  const handleEdit = useCallback((menu: Menu) => {
    setSelectedMenu(menu)
    setDialogMode("edit")
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((menu: Menu) => {
    setMenuToDelete(menu)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (menuToDelete) {
      try {
        // mutator 的 onSettled 会自动 invalidate tree query
        await deleteMenu(menuToDelete.id)
        setDeleteConfirmOpen(false)
        setMenuToDelete(null)
      } catch (err) {
        console.error("Failed to delete menu:", err)
      }
    }
  }, [menuToDelete, deleteMenu])

  const handleAdd = useCallback(() => {
    setSelectedMenu(null)
    setDialogMode("add")
    setDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(async (values: MenuFormValues) => {
    try {
      if (dialogMode === "add") {
        await createMenu(values)
      } else if (selectedMenu) {
        await updateMenu(selectedMenu.id, values)
      }
      setDialogOpen(false)
      setSelectedMenu(null)
      // 不再手动 fetchMenuTree() — mutator 内部已 invalidate
    } catch (err) {
      console.error("Failed to save menu:", err)
    }
  }, [dialogMode, selectedMenu, createMenu, updateMenu])

  return (
    <BaseLayout title="菜单管理" description="管理系统的菜单结构和权限配置">
      <div className="flex flex-col gap-4">
        {/* Action Bar */}
        <div className="px-4 lg:px-6 flex justify-end">
          <Button onClick={handleAdd} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            添加菜单
          </Button>
        </div>

        {/* Table */}
        <div className="px-4 lg:px-6">
          <MenuTreeTable
            data={menuTree}
            loading={treeLoading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Menu Dialog */}
      <MenuDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        menu={selectedMenu}
        parentMenus={topLevelMenus}
        onSubmit={handleSubmit}
        loading={false}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除菜单"
        description={`确定要删除菜单「${menuToDelete?.name}」吗？此操作无法撤销。`}
        onConfirm={confirmDelete}
        confirmText="删除"
        variant="destructive"
      />
    </BaseLayout>
  )
}
