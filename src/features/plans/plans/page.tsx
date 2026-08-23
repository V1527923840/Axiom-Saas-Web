"use client"

import { useEffect, useState, useMemo } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { usePlans, usePlanMenus, useAssignPlanMenus } from "../hooks/use-plans"
import { useMenuTree } from "@/features/menus/hooks/use-menus"
import { plansColumns } from "../components/plans-columns"
import { DataTable } from "@/components/data-table"
import { PlanDialog } from "../components/plan-dialog"
import { PlanForm } from "../components/plan-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Plan, PlanFormValues } from "../types"

export default function PlansPage() {
  // searchQuery 是「草稿」(用户在输入框里敲的字),
  // appliedSearch 是「已应用」(放进 queryKey 触发 TanStack Query 拉数据)。
  // 搜索按钮 = 把草稿提交为已应用。queryKey 改了 TanStack Query 自动 refetch —
  // 不需要手动调 fetchPlans。
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  // page / pageSize 走 useState — 翻页时它们变,useMemo 重算 params,
  // queryKey 跟着变,TanStack Query 自动 refetch。
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)

  const params = useMemo(
    () => ({
      page,
      pageSize,
      search: appliedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [page, pageSize, appliedSearch, statusFilter],
  )

  const {
    items: plans,
    pagination,
    isLoading: loading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
  } = usePlans(params)

  // 菜单树走 useMenuTree — 跨模块订阅,创建/删除菜单时自动 invalidate
  // (use-menus.ts 里的 create/update/delete 都 invalidate ['menus', 'tree'])。
  const { data: menuTree = [] } = useMenuTree()

  // assignPlanMenus 走独立 mutation hook — 不影响 plans list 缓存,
  // 仅 invalidate ['plans', planId, 'menus'] 让 usePlanMenus 重拉。
  const assignMenus = useAssignPlanMenus()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([])

  // 关联菜单走 usePlanMenus — 仅在编辑某个 plan 时拉取。
  // 双闸门:formDialogOpen + selectedPlan.id(避免刚开 add 弹窗就触发空 planId 请求)。
  const planMenusQuery = usePlanMenus(formDialogOpen ? selectedPlan?.id ?? null : null)
  const isLoadingMenus = planMenusQuery.isLoading

  useEffect(() => {
    // planMenusQuery.data 一旦有值,扁平化抽出所有 id(包括 nested children)。
    const menus = planMenusQuery.data
    if (menus && selectedPlan && formDialogOpen) {
      const allIds: string[] = []
      const collectIds = (nodes: typeof menus) => {
        nodes.forEach((m) => {
          allIds.push(m.id)
          if (m.children && m.children.length > 0) {
            collectIds(m.children)
          }
        })
      }
      collectIds(menus)
      setSelectedMenuIds(allIds)
    } else if (!selectedPlan) {
      setSelectedMenuIds([])
    }
  }, [planMenusQuery.data, selectedPlan, formDialogOpen])

  const handlePageChange = (next: number) => {
    setPage(next)
  }

  const handlePageSizeChange = (nextSize: number) => {
    // pageSize 暂时写死 10,这个 callback 保留是因为 DataTable pagination
    // shape 要求 onPageSizeChange 存在。未来要做 page size 选择器时,
    // 把 pageSize 也提为 useState,然后 params 重算 → queryKey 变 → 自动 refetch。
    void nextSize
    setPage(0)
  }

  const handleSearch = () => {
    setAppliedSearch(searchQuery)
    setPage(0)
  }

  const handleView = (plan: Plan) => {
    setSelectedPlan(plan)
    setDialogMode("view")
    setDialogOpen(true)
  }

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan)
    setDialogMode("view")
    setDialogOpen(false)
    setFormDialogOpen(true)
  }

  const handleDelete = (plan: Plan) => {
    setPlanToDelete(plan)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (planToDelete) {
      try {
        await deletePlan(planToDelete.id)
      } catch (error) {
        console.error("Failed to delete plan:", error)
      }
    }
  }

  const handleFormSubmit = async (values: PlanFormValues) => {
    try {
      let targetPlanId: string | undefined
      if (selectedPlan) {
        await updatePlan(selectedPlan.id, values)
        targetPlanId = selectedPlan.id
      } else {
        const newPlan = await createPlan(values)
        targetPlanId = newPlan?.id
      }

      // 保存菜单关联 — 仅在有 menuIds 时调用,避免空数组 PATCH 抖动后端
      if (targetPlanId && values.menuIds) {
        await assignMenus.mutateAsync({
          planId: targetPlanId,
          menuIds: values.menuIds,
        })
      }

      setFormDialogOpen(false)
      setDialogOpen(false)
      setSelectedPlan(null)
    } catch (error) {
      console.error("Failed to save plan:", error)
    }
  }

  const columns = plansColumns({ onView: handleView, onEdit: handleEdit, onDelete: handleDelete })

  return (
    <BaseLayout title="套餐管理" description="管理订阅套餐">
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Input
            placeholder="搜索套餐名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
            <SelectTrigger className="w-[150px] cursor-pointer">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">启用</SelectItem>
              <SelectItem value="inactive">禁用</SelectItem>
              <SelectItem value="deprecated">废弃</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} className="cursor-pointer">
            搜索
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedPlan(null)
              setFormDialogOpen(true)
            }}
            className="cursor-pointer"
          >
            添加套餐
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 lg:px-6">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            加载错误: {error instanceof Error ? error.message : String(error)}
          </div>
        )}
        <DataTable
          columns={columns}
          data={plans}
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
      <PlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={selectedPlan}
        mode={dialogMode}
        onEdit={(plan) => {
          setSelectedPlan(plan)
          setDialogMode("edit")
        }}
      />

      {/* Form Dialog */}
      {formDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {selectedPlan ? "编辑套餐" : "创建套餐"}
            </h2>
            {isLoadingMenus ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">加载菜单中...</div>
              </div>
            ) : (
              <PlanForm
                key={selectedPlan ? `${selectedPlan.id}-${isLoadingMenus}` : 'new'}
                initialData={selectedPlan ? { ...selectedPlan, menuIds: selectedMenuIds } : undefined}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setFormDialogOpen(false)
                  setSelectedPlan(null)
                  setSelectedMenuIds([])
                }}
                loading={loading}
                menuTree={menuTree}
              />
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除套餐"
        description={`确定要删除套餐 "${planToDelete?.name}" 吗？此操作无法撤销。`}
        onConfirm={confirmDelete}
        confirmText="删除"
        variant="destructive"
      />
    </div>
    </BaseLayout>
  )
}
