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
import { Textarea } from "@/components/ui/textarea"
import type { Plan, PlanFormValues } from "../types"
import { PlanMenuSelector } from "./plan-menu-selector"
import type { MenuTreeNode } from "@/features/menus/types"

const planFormSchema = z.object({
  name: z.string().min(2, "套餐名称至少需要2个字符"),
  description: z.string().optional(),
  tier: z.enum(["Lv0", "Lv1", "Lv2", "Lv3"]),
  cycle: z.enum(["monthly", "quarterly", "yearly", "lifetime"]),
  pointsQuota: z.number().min(0, "积分额度不能为负数"),
  chatQuota: z.number().min(0, "聊天次数不能为负数"),
  price: z.number().min(0, "价格不能为负数"),
  currency: z.string().default("CNY"),
  status: z.enum(["active", "inactive", "deprecated"]),
  features: z.array(z.string()).optional(),
  menuIds: z.array(z.string()).optional(),
})

interface PlanFormProps {
  initialData?: Plan
  onSubmit: (values: PlanFormValues) => void
  onCancel?: () => void
  loading?: boolean
  menuTree?: MenuTreeNode[]
}

export function PlanForm({ initialData, onSubmit, onCancel, loading, menuTree = [] }: PlanFormProps) {
  const form = useForm({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      tier: initialData?.tier || "Lv0",
      cycle: initialData?.cycle || "monthly",
      pointsQuota: initialData?.pointsQuota ?? 0,
      chatQuota: initialData?.chatQuota ?? 0,
      price: initialData?.price ?? 0,
      currency: initialData?.currency || "CNY",
      status: initialData?.status || "active",
      features: initialData?.features || [],
      menuIds: initialData?.menuIds || [],
    },
  })

  const handleSubmit = (values: z.infer<typeof planFormSchema>) => {
    onSubmit(values as PlanFormValues)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>套餐名称</FormLabel>
              <FormControl>
                <Input placeholder="例如：基础版、进阶版" {...field} />
              </FormControl>
              <FormDescription>套餐的显示名称</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>描述</FormLabel>
              <FormControl>
                <Textarea placeholder="套餐的详细描述..." {...field} />
              </FormControl>
              <FormDescription>简要描述套餐内容和适用场景</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>等级</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择等级" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Lv0">免费</SelectItem>
                    <SelectItem value="Lv1">基础</SelectItem>
                    <SelectItem value="Lv2">进阶</SelectItem>
                    <SelectItem value="Lv3">高级</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cycle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>计费周期</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择周期" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">月付</SelectItem>
                    <SelectItem value="quarterly">季付</SelectItem>
                    <SelectItem value="yearly">年付</SelectItem>
                    <SelectItem value="lifetime">终身</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pointsQuota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>积分额度</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormDescription>每月赠送的积分数量</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="chatQuota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>聊天次数</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormDescription>每月赠送的聊天次数</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>价格 (CNY)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} value={field.value ?? ""} onChange={e => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormDescription>套餐价格，0表示免费</FormDescription>
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
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                    <SelectItem value="deprecated">废弃</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="menuIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>关联菜单</FormLabel>
              <FormControl>
                <PlanMenuSelector
                  menus={menuTree}
                  value={field.value || []}
                  onChange={field.onChange}
                  disabled={loading}
                />
              </FormControl>
              <FormDescription>选择该套餐包含的菜单权限</FormDescription>
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
            {loading ? "保存中..." : initialData ? "保存修改" : "创建套餐"}
          </Button>
        </div>
      </form>
    </Form>
  )
}