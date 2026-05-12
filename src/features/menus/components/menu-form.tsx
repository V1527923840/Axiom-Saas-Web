"use client"

import type { Menu } from "../types"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
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
import { Button } from "@/components/ui/button"
import type { MenuFormValues } from "../types"

interface MenuFormProps {
  initialData?: Menu | null
  parentMenus: Menu[]
  onSubmit: (values: MenuFormValues) => void
  onCancel: () => void
  loading?: boolean
}

const menuSchema = z.object({
  name: z.string().min(2, "菜单名称至少2个字符").max(20, "菜单名称最多20个字符"),
  code: z.string().min(2, "菜单编码至少2个字符").max(50, "菜单编码最多50个字符").regex(/^[a-zA-Z0-9_]+$/, "只能包含字母、数字和下划线"),
  parentId: z.string().nullable(),
  path: z.string().min(1, "请输入菜单路径"),
  icon: z.string().min(1, "请输入图标名称"),
  sortOrder: z.coerce.number().int().min(0, "排序号最小为0"),
  status: z.enum(["active", "inactive"]),
})

export function MenuForm({ initialData, parentMenus, onSubmit, onCancel, loading }: MenuFormProps) {
  const form = useForm<MenuFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(menuSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      parentId: initialData?.parentId || null,
      path: initialData?.path || "",
      icon: initialData?.icon || "",
      sortOrder: initialData?.sortOrder ?? 0,
      status: initialData?.status || "active",
    },
  })

  const handleSubmit = (values: MenuFormValues) => {
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>菜单名称</FormLabel>
              <FormControl>
                <Input placeholder="输入菜单名称" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>菜单编码</FormLabel>
              <FormControl>
                <Input placeholder="输入唯一编码" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>上级菜单</FormLabel>
              <Select onValueChange={(value) => field.onChange(value === "null" ? null : value)} defaultValue={field.value === null ? "null" : field.value || "null"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择上级菜单（可选）" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null">顶级菜单</SelectItem>
                  {parentMenus
                    .filter((menu) => menu.parentId === null && menu.id !== initialData?.id)
                    .map((menu) => (
                      <SelectItem key={menu.id} value={menu.id}>
                        {menu.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="path"
          render={({ field }) => (
            <FormItem>
              <FormLabel>菜单路径</FormLabel>
              <FormControl>
                <Input placeholder="输入路由路径" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>图标名称</FormLabel>
              <FormControl>
                <Input placeholder="输入图标名称（lucide）" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>排序号</FormLabel>
              <FormControl>
                <Input type="number" min="0" {...field} />
              </FormControl>
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
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">禁用</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
            取消
          </Button>
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading ? "保存中..." : "保存"}
          </Button>
        </div>
      </form>
    </Form>
  )
}