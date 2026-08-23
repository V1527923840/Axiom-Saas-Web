"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { MenuTree } from "@/features/menus/components/menu-tree"
import type { User, UserFormValues } from "../types"
import { DEFAULT_USER_PASSWORD } from "../types"
import { useAuth } from "@/contexts/auth-context"
import { usePlans } from "@/features/plans/hooks/use-plans"
import { useRoles } from "../hooks/use-roles"
import { MultiSelect } from "@/components/ui/multi-select"
import { get, post } from "@/lib/api"
import type { MenuTreeNode } from "@/features/menus/types"

const userFormSchema = z.object({
  name: z.string().min(2, "名字至少需要2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  roleIds: z.array(z.number()).default([]),
  tier: z.enum(["Lv0", "Lv1", "Lv2", "Lv3"]),
  status: z.enum(["active", "inactive", "suspended", "pending"]),
  currentPlanId: z.string().optional(),
  // Only validated for create flow. Empty string is allowed and means
  // "use the shared default password" (applied by the hook before send).
  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length === 0 || val.length >= 6,
      "密码至少需要6个字符",
    ),
})

interface UserFormProps {
  initialData?: User
  onSubmit: (values: UserFormValues) => void
  onCancel?: () => void
  loading?: boolean
  /**
   * Edit-only: handler invoked when the operator clicks "重置密码".
   * Receives the user id; the caller is responsible for actually issuing
   * the password reset (the form does not own that API call). Returns a
   * promise so the button can show a loading state.
   */
  onResetPassword?: (userId: string) => Promise<void>
}

export function UserForm({ initialData, onSubmit, onCancel, loading, onResetPassword }: UserFormProps) {
  const { token } = useAuth()
  const { plans, fetchPlans } = usePlans()
  // useRoles 现在走 TanStack Query — `roles` 是 query.data
  const rolesQuery = useRoles()
  const roleOptions = rolesQuery.data ?? []
  const form = useForm({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      roleIds: initialData?.roles?.map((r) => r.id) ?? [],
      tier: initialData?.tier || "Lv0",
      status: initialData?.status || "active",
      currentPlanId: initialData?.currentPlanId || "",
      // Empty string => hook substitutes DEFAULT_USER_PASSWORD before send.
      password: "",
    },
  })

  const [menuDialogOpen, setMenuDialogOpen] = useState(false)
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([])
  const [checkedMenuIds, setCheckedMenuIds] = useState<string[]>([])
  const [menuLoading, setMenuLoading] = useState(false)

  useEffect(() => {
    if (token) {
      // fetchPlans 还是旧 useState 模式(use-plans 还没迁),TanStack Query 这边不用手动 fetch。
      fetchPlans({ page: 0, pageSize: 50, status: 'active' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Re-sync the form whenever the target user changes (e.g. switching
  // between two users without closing the dialog, or after the parent
  // re-mounts the form with new initialData). useForm only reads
  // defaultValues on the first render, so without this reset the inputs
  // would keep showing the first user's values.
  useEffect(() => {
    form.reset({
      name: initialData?.name || "",
      email: initialData?.email || "",
      roleIds: initialData?.roles?.map((r) => r.id) ?? [],
      tier: initialData?.tier || "Lv0",
      status: initialData?.status || "active",
      currentPlanId: initialData?.currentPlanId || "",
      password: "",
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id])

  // Edit-mode preload of roleIds via GET /v1/users/:id/roles. When editing
  // an existing user, fetch the authoritative role set from the server
  // (the user payload only carries a legacy `role` field for backward compat).
  useEffect(() => {
    if (initialData?.id && token) {
      (async () => {
        const response = await get<number[]>(
          `/v1/users/${initialData.id}/roles`,
          { token: token ?? undefined },
        )
        const ids = Array.isArray(response.data) ? response.data : []
        form.setValue("roleIds", ids)
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, token])

  const handleSubmit = (values: z.infer<typeof userFormSchema>) => {
    onSubmit(values as UserFormValues)
  }

  const fetchMenuTree = async () => {
    setMenuLoading(true)
    try {
      const response = await get<MenuTreeNode[]>("/v1/menus/tree", {
        token: token || undefined,
      })
      // API returns Menu[] directly (not wrapped in { data: ... })
      const rawData = response.data as unknown as { data?: MenuTreeNode[] } | MenuTreeNode[]
      let treeData: MenuTreeNode[] = []
      if (Array.isArray(rawData)) {
        treeData = rawData
      } else if (rawData && 'data' in rawData && Array.isArray(rawData.data)) {
        treeData = rawData.data
      }
      setMenuTree(treeData)
    } catch (err) {
      console.error("Failed to fetch menu tree:", err)
    } finally {
      setMenuLoading(false)
    }
  }

  const fetchUserMenus = async () => {
    if (!initialData?.id) return
    try {
      const response = await get<{ id: string }[]>(`/v1/users/${initialData.id}/extra-menus`, {
        token: token || undefined,
      })
      // Handle both array and wrapped response
      const rawData = response.data as unknown as { data?: { id: string }[] } | { id: string }[]
      let menusData: { id: string }[] = []
      if (Array.isArray(rawData)) {
        menusData = rawData
      } else if (rawData && 'data' in rawData && Array.isArray(rawData.data)) {
        menusData = rawData.data
      }
      setCheckedMenuIds(menusData.map((m) => m.id))
    } catch (err) {
      console.error("Failed to fetch user menus:", err)
    }
  }

  const handleOpenMenuDialog = async () => {
    await fetchMenuTree()
    await fetchUserMenus()
    setMenuDialogOpen(true)
  }

  const [resetting, setResetting] = useState(false)
  const handleResetPassword = async () => {
    if (!initialData?.id || !onResetPassword) return
    // Lightweight confirm via window.confirm — avoids pulling in a dialog
    // for a one-click admin action. Falls back gracefully if confirm isn't
    // available (e.g. inside certain test runners).
    const ok = typeof window === "undefined"
      ? true
      : window.confirm(
          `确认将 ${initialData.name} 的密码重置为默认密码 ${DEFAULT_USER_PASSWORD}?`,
        )
    if (!ok) return
    setResetting(true)
    try {
      await onResetPassword(initialData.id)
      toast.success(`密码已重置为 ${DEFAULT_USER_PASSWORD}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误"
      toast.error(`重置密码失败: ${message}`)
    } finally {
      setResetting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>昵称</FormLabel>
              <FormControl>
                <Input placeholder="请输入用户昵称" {...field} />
              </FormControl>
              <FormDescription>用户的显示名称</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@example.com" {...field} />
              </FormControl>
              <FormDescription>用户的唯一邮箱地址</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password is only collected at create time. For edits we don't
            expose a password change here — that's a separate self-service
            flow. The hook substitutes a shared default when this field is
            left blank, so the new user can log in immediately. */}
        {!initialData && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>初始密码</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={`留空将使用默认密码 ${DEFAULT_USER_PASSWORD}`}
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  留空则使用统一默认密码 ({DEFAULT_USER_PASSWORD}),用户可在首次登录后自行修改
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="roleIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>角色</FormLabel>
              <MultiSelect
                options={roleOptions.map((r) => ({
                  label: r.isSuperAdmin
                    ? `${r.name}(超管)`
                    : r.name,
                  value: String(r.id),
                }))}
                selected={(field.value ?? []).map(String)}
                onChange={(vals) => field.onChange(vals.map(Number))}
                placeholder="选择用户角色"
              />
              <FormDescription>
                勾选该用户拥有的角色;超级管理员拥有全部功能权限。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentPlanId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>当前套餐</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择当前套餐" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} ({plan.tier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>用户的订阅套餐</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>状态</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择用户状态" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="inactive">未激活</SelectItem>
                  <SelectItem value="suspended">已暂停</SelectItem>
                  <SelectItem value="pending">待验证</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>用户账户的当前状态</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">额外菜单权限</h4>
              <p className="text-xs text-muted-foreground">
                为用户分配额外的菜单访问权限（可分配 {checkedMenuIds.length} 个菜单）
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenMenuDialog}
              className="cursor-pointer"
            >
              {initialData ? "编辑菜单" : "分配菜单"}
            </Button>
          </div>
        </div>

        {/* Edit-only: reset the user's password back to the shared default.
            Kept separate from "保存修改" so it doesn't accidentally clobber
            any other form fields the admin was about to edit. */}
        {initialData?.id && onResetPassword && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">密码管理</h4>
                <p className="text-xs text-muted-foreground">
                  重置后将密码设为默认密码 ({DEFAULT_USER_PASSWORD}),用户下次登录需使用此密码
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetPassword}
                disabled={resetting || loading}
                className="cursor-pointer"
              >
                {resetting ? "重置中..." : "重置密码"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
              取消
            </Button>
          )}
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading ? "保存中..." : initialData ? "保存修改" : "创建用户"}
          </Button>
        </div>
      </form>

      {/* Menu Assignment Dialog */}
      <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              分配菜单权限 - {initialData?.name || "新用户"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {menuLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <MenuTree
                menus={menuTree}
                checkedKeys={checkedMenuIds}
                onCheckChange={setCheckedMenuIds}
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMenuDialogOpen(false)}
              className="cursor-pointer"
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                // For new users there is no server-side user id yet, so the
                // POST /v1/users/:id/extra-menus endpoint cannot be called.
                // Block the click + surface a hint instead of silently doing
                // nothing (the previous behavior left the user staring at
                // an open dialog with no feedback).
                if (!initialData?.id) {
                  toast.info("请先保存用户,创建成功后再分配菜单")
                  return
                }
                try {
                  await post(`/v1/users/${initialData.id}/extra-menus`, {
                    menuIds: checkedMenuIds,
                  }, { token: token ?? undefined })
                  setMenuDialogOpen(false)
                  toast.success("菜单已保存")
                } catch (err) {
                  const message = err instanceof Error ? err.message : "未知错误"
                  toast.error(`菜单保存失败: ${message}`)
                }
              }}
              className="cursor-pointer"
            >
              保存菜单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  )
}