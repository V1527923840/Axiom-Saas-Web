"use client"

import { useEffect, useState, useCallback } from "react"
import { useConsumptions } from "../hooks/use-consumptions"
import { consumptionsColumns } from "../components/consumptions/consumptions-columns"
import { ConsumptionFilters } from "../components/consumptions/consumption-filters"
import { ConsumptionDialog } from "../components/consumptions/consumption-dialog"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import type { Consumption, ConsumptionFilters as ConsumptionFiltersType } from "../types"

export default function ConsumptionsPage() {
  const {
    consumptions,
    loading,
    error,
    pagination,
    fetchConsumptions,
  } = useConsumptions()

  const [filters, setFilters] = useState<ConsumptionFiltersType>({
    dateRange: undefined,
    userSearch: "",
    consumptionType: "all",
  })

  const [selectedConsumption, setSelectedConsumption] = useState<Consumption | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleFilterChange = useCallback((newFilters: ConsumptionFiltersType) => {
    setFilters(newFilters)
  }, [])

  const handleApplyFilters = useCallback(() => {
    fetchConsumptions({
      page: 0,
      pageSize: pagination.pageSize,
      userSearch: filters.userSearch || undefined,
      consumeType: filters.consumptionType === "all" ? undefined : filters.consumptionType,
      dateFrom: filters.dateRange?.from?.toISOString().split("T")[0],
      dateTo: filters.dateRange?.to?.toISOString().split("T")[0],
    })
  }, [filters, pagination.pageSize, fetchConsumptions])

  const handlePageChange = useCallback((page: number) => {
    fetchConsumptions({
      page,
      pageSize: pagination.pageSize,
      userSearch: filters.userSearch || undefined,
      consumeType: filters.consumptionType === "all" ? undefined : filters.consumptionType,
      dateFrom: filters.dateRange?.from?.toISOString().split("T")[0],
      dateTo: filters.dateRange?.to?.toISOString().split("T")[0],
    })
  }, [filters, pagination.pageSize, fetchConsumptions])

  const handlePageSizeChange = useCallback((pageSize: number) => {
    fetchConsumptions({
      page: 0,
      pageSize,
      userSearch: filters.userSearch || undefined,
      consumeType: filters.consumptionType === "all" ? undefined : filters.consumptionType,
      dateFrom: filters.dateRange?.from?.toISOString().split("T")[0],
      dateTo: filters.dateRange?.to?.toISOString().split("T")[0],
    })
  }, [filters, fetchConsumptions])

  const handleView = useCallback((consumption: Consumption) => {
    setSelectedConsumption(consumption)
    setDialogOpen(true)
  }, [])

  const columns = consumptionsColumns({ onView: handleView })

  useEffect(() => {
    handleApplyFilters()
  }, [])

  return (
    <BaseLayout title="消费管理" description="查看所有用户的积分消费记录">
      <div className="flex flex-col gap-4">
        {/* Filters */}
        <div className="px-4 lg:px-6">
          <ConsumptionFilters onFilterChange={handleFilterChange} initialFilters={filters} />
        </div>

        {/* Table */}
        <div className="px-4 lg:px-6">
          <DataTable
            columns={columns}
            data={consumptions}
            loading={loading}
            error={error}
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
      </div>

      {/* Detail Dialog */}
      <ConsumptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        consumption={selectedConsumption}
      />
    </BaseLayout>
  )
}
