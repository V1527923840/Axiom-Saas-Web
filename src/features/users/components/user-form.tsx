"use client"

import { useEffect } from "react"
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
import type { User, UserFormValues } from "../types"
import { useAuth } from "@/contexts/auth-context"
import { usePlans } from "@/features/plans/hooks/use-plans"

const userFormSchema = z.object({
  name: z.string().min(2, "名字至少需要2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  role: z.enum(["super_admin", "admin", "user"]),
  tier: z.enum(["Lv0", "Lv1", "Lv2", "Lv3"]),
  status: z.enum(["active", "inactive", "suspended", "pending"]),
  currentPlanId: z.string().optional(),
})

interface UserFormProps {
  initialData?: User
  onSubmit: (values: UserFormValues) => void
  onCancel?: () => void
  loading?: boolean
}

export function UserForm({ initialData, onSubmit, onCancel, loading }: UserFormProps) {
  const { token } = useAuth()
  const { plans, fetchPlans } = usePlans()
  const form = useForm({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      role: initialData?.role || "user",
      tier: initialData?.tier || "Lv0",
      status: initialData?.status || "active",
      currentPlanId: initialData?.currentPlanId || "",
    },
  })

  // Fetch plans on mount (only when token is available)
  useEffect(() => {
    if (token) {
      fetchPlans({ page: 0, pageSize: 50, status: 'active' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleSubmit = (values: z.infer<typeof userFormSchema>) => {
    onSubmit(values as UserFormValues)
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

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>角色</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择用户角色" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="super_admin">超级管理员</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="user">普通用户</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>用户的系统角色权限</FormDescription>
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
    </Form>
  )
}