"use client"

import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useAuth } from "@/contexts/auth-context"
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

export default function UsersPage() {
  const { token } = useAuth()
  const {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  } = useUsers()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | undefined>("all")
  const [statusFilter, setStatusFilter] = useState<string | undefined>("all")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  useEffect(() => {
    // Only fetch when token is available (user is logged in)
    if (token) {
      fetchUsers({
        page: 0,
        pageSize: pagination.pageSize,
        search: searchQuery || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      })
    }
  }, [token, fetchUsers])

  const handlePageChange = (page: number) => {
    fetchUsers({
      page,
      pageSize: pagination.pageSize,
      search: searchQuery || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
  }

  const handlePageSizeChange = (pageSize: number) => {
    fetchUsers({
      page: 0,
      pageSize,
      search: searchQuery || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
  }

  const handleSearch = () => {
    fetchUsers({
      page: 0,
      pageSize: pagination.pageSize,
      search: searchQuery || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
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
      } catch (error) {
        console.error("Failed to delete user:", error)
      }
    }
  }

  const handleFormSubmit = async (values: UserFormValues) => {
    try {
      if (selectedUser) {
        await updateUser(selectedUser.id, values)
      } else {
        await createUser(values as any)
      }
      setFormDialogOpen(false)
      setDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      console.error("Failed to save user:", error)
    }
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
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value)}>
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
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
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
            加载错误: {error}
          </div>
        )}
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
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
              loading={loading}
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