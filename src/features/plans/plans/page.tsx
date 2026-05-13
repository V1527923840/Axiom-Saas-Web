"use client"

import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useAuth } from "@/contexts/auth-context"
import { usePlans } from "../hooks/use-plans"
import { useMenus } from "@/features/menus/hooks/use-menus"
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
import type { MenuTreeNode } from "@/features/menus/types"

export default function PlansPage() {
  const { token } = useAuth()
  const {
    plans,
    loading,
    error,
    pagination,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    fetchPlanMenus,
    assignPlanMenus,
  } = usePlans()
  const { fetchMenuTree } = useMenus()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | undefined>("all")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([])
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([])
  const [isLoadingMenus, setIsLoadingMenus] = useState(false)

  useEffect(() => {
    if (token) {
      fetchPlans({
        page: 0,
        pageSize: pagination.pageSize,
        search: searchQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      })
    }
  }, [token, fetchPlans])

  useEffect(() => {
    // Fetch menu tree when form dialog opens
    if (formDialogOpen && menuTree.length === 0) {
      fetchMenuTree().then((tree) => {
        setMenuTree(tree)
      })
    }
  }, [formDialogOpen, fetchMenuTree, menuTree.length])

  useEffect(() => {
    // When editing a plan, fetch its menus
    if (selectedPlan && formDialogOpen) {
      setIsLoadingMenus(true)
      fetchPlanMenus(selectedPlan.id).then((menus) => {
        // Flatten tree to get ALL menu IDs (including nested children)
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
        setIsLoadingMenus(false)
      })
    } else if (!selectedPlan) {
      setSelectedMenuIds([])
    }
  }, [selectedPlan, formDialogOpen, fetchPlanMenus])

  const handlePageChange = (page: number) => {
    fetchPlans({
      page,
      pageSize: pagination.pageSize,
      search: searchQuery || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
  }

  const handlePageSizeChange = (pageSize: number) => {
    fetchPlans({
      page: 0,
      pageSize,
      search: searchQuery || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
  }

  const handleSearch = () => {
    fetchPlans({
      page: 0,
      pageSize: pagination.pageSize,
      search: searchQuery || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
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
      if (selectedPlan) {
        await updatePlan(selectedPlan.id, values)
        // Save menu associations
        if (values.menuIds) {
          await assignPlanMenus(selectedPlan.id, values.menuIds)
        }
      } else {
        const newPlan = await createPlan(values as any)
        // Save menu associations for new plan
        if (newPlan?.id && values.menuIds) {
          await assignPlanMenus(newPlan.id, values.menuIds)
        }
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
            加载错误: {error}
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