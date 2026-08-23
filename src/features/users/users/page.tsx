"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useUsers } from "../hooks/use-users"
import { usersColumns } from "../components/users-columns"
import { DataTable } from "@/components/data-table"
import { UserDialog } from "../components/user-dialog"
import { UserForm } from "../components/user-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { User, UserFormValues } from "../types"

const PAGE_SIZE = 10

export default function UsersPage() {
  // searchQuery 是「草稿」(用户在输入框里敲的字),
  // search 是「已应用」(放进 queryKey 触发 TanStack Query 拉数据)。
  // 搜索按钮 = 把草稿提交为已应用。search 在 useUsers 里走 queryKey,
  // 改了就自动 refetch — 不需要手动调 fetchUsers。
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  // page / pageSize 走 useState — 翻页时它们变,useMemo 重算 params,
  // queryKey 跟着变,TanStack Query 自动 refetch。
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const params = useMemo(
    () => ({
      page,
      pageSize,
      search: appliedSearch || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [page, pageSize, appliedSearch, roleFilter, statusFilter],
  )

  const {
    items,
    pagination,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
  } = useUsers(params)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const handlePageChange = (next: number) => {
    setPage(next)
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPageSize(pageSize)
    setPage(0)
  }

  const handleSearch = () => {
    setAppliedSearch(searchQuery)
    setPage(0)
  }

  const handleView = (user: User) => {
    setSelectedUser(user)
    setDialogMode("view")
    setDialogOpen(true)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setDialogMode("view")
    setDialogOpen(false)
    setFormDialogOpen(true)
  }

  const handleDelete = (user: User) => {
    setUserToDelete(user)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        await deleteUser(userToDelete.id)
        toast.success(`已删除用户 ${userToDelete.name}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : "未知错误"
        toast.error(`删除失败: ${message}`)
      }
    }
  }

  const handleFormSubmit = async (values: UserFormValues) => {
    try {
      if (selectedUser) {
        await updateUser(selectedUser.id, values)
        toast.success("用户已更新")
      } else {
        await createUser(values)
        toast.success("用户已创建")
      }
      setFormDialogOpen(false)
      setDialogOpen(false)
      setSelectedUser(null)
    } catch (err) {
      // Surface backend errors (e.g. 422 validation, 422 emailAlreadyExists)
      // instead of silently logging to console — the user needs feedback.
      const message = err instanceof Error ? err.message : "未知错误"
      toast.error(`${selectedUser ? "更新" : "创建"}失败: ${message}`)
    }
  }

  // Edit-only: reset the targeted user's password back to the default.
  // Implemented as a focused PATCH that only carries `password` so we
  // don't disturb any unsaved edits the operator may have made in the
  // form before clicking the reset button.
  const handleResetPassword = async (userId: string) => {
    await updateUser(userId, { password: "" })
  }

  const columns = usersColumns({ onView: handleView, onEdit: handleEdit, onDelete: handleDelete })

  return (
    <BaseLayout title="用户管理" description="管理系统用户">
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Input
            placeholder="搜索用户名称或邮箱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px] cursor-pointer">
              <SelectValue placeholder="选择角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部角色</SelectItem>
              <SelectItem value="super_admin">超级管理员</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
              <SelectItem value="user">普通用户</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] cursor-pointer">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="inactive">未激活</SelectItem>
              <SelectItem value="suspended">已暂停</SelectItem>
              <SelectItem value="pending">待验证</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} className="cursor-pointer">
            搜索
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedUser(null)
              setFormDialogOpen(true)
            }}
            className="cursor-pointer"
          >
            添加用户
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 lg:px-6">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            加载错误: {(error as Error).message}
          </div>
        )}
        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          showToolbar={false}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
        />
      </div>

      {/* Detail Dialog */}
      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        mode={dialogMode}
        onEdit={(user) => {
          setSelectedUser(user)
          setDialogMode("edit")
        }}
      />

      {/* Form Dialog */}
      {formDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedUser ? "编辑用户" : "创建用户"}
            </h2>
            <UserForm
              initialData={selectedUser || undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setFormDialogOpen(false)
                setSelectedUser(null)
              }}
              loading={isLoading}
              onResetPassword={handleResetPassword}
            />
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除用户"
        description={`确定要删除用户 "${userToDelete?.name}" 吗？此操作无法撤销。`}
        onConfirm={confirmDelete}
        confirmText="删除"
        variant="destructive"
      />
    </div>
    </BaseLayout>
  )
}