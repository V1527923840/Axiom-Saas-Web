"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { usePaymentFlows } from "../hooks/use-payment-flows"
import { flowsColumns } from "../components/flows/flows-columns"
import { FlowFilters } from "../components/flows/flow-filters"
import { FlowDialog } from "../components/flows/flow-dialog"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import type { PaymentFlow, FlowFilters as FlowFiltersType } from "../types"
import { formatLocalDate } from "@/lib/utils"

export default function FlowsPage() {
  const {
    flows,
    loading,
    error,
    pagination,
    fetchFlows,
  } = usePaymentFlows()

  const [filters, setFilters] = useState<FlowFiltersType>({
    dateRange: undefined,
    userSearch: "",
    type: "all",
    paymentMethod: "all",
    status: "all",
  })

  const [selectedFlow, setSelectedFlow] = useState<PaymentFlow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleFilterChange = useCallback((newFilters: FlowFiltersType) => {
    setFilters(newFilters)
  }, [])

  const handleApplyFilters = useCallback((filters: FlowFiltersType) => {
    fetchFlows({
      page: 0,
      pageSize: pagination.pageSize,
      userSearch: filters.userSearch || undefined,
      type: filters.type === "all" ? undefined : filters.type,
      paymentMethod: filters.paymentMethod === "all" ? undefined : filters.paymentMethod,
      status: filters.status === "all" ? undefined : filters.status,
      dateFrom: filters.dateRange?.from ? formatLocalDate(filters.dateRange.from) : undefined,
      dateTo: filters.dateRange?.to ? formatLocalDate(filters.dateRange.to) : undefined,
    })
  }, [pagination.pageSize, fetchFlows])

  const handlePageChange = useCallback((page: number) => {
    console.log("[Flows] handlePageChange:", { page })
    fetchFlows({
      page,
      pageSize: pagination.pageSize,
      userSearch: filters.userSearch || undefined,
      type: filters.type === "all" ? undefined : filters.type,
      paymentMethod: filters.paymentMethod === "all" ? undefined : filters.paymentMethod,
      status: filters.status === "all" ? undefined : filters.status,
      dateFrom: filters.dateRange?.from ? formatLocalDate(filters.dateRange.from) : undefined,
      dateTo: filters.dateRange?.to ? formatLocalDate(filters.dateRange.to) : undefined,
    })
  }, [filters, pagination.pageSize, fetchFlows])

  const handlePageSizeChange = useCallback((pageSize: number) => {
    fetchFlows({
      page: 0,
      pageSize,
      userSearch: filters.userSearch || undefined,
      type: filters.type === "all" ? undefined : filters.type,
      paymentMethod: filters.paymentMethod === "all" ? undefined : filters.paymentMethod,
      status: filters.status === "all" ? undefined : filters.status,
      dateFrom: filters.dateRange?.from ? formatLocalDate(filters.dateRange.from) : undefined,
      dateTo: filters.dateRange?.to ? formatLocalDate(filters.dateRange.to) : undefined,
    })
  }, [filters, fetchFlows])

  const handleView = useCallback((flow: PaymentFlow) => {
    setSelectedFlow(flow)
    setDialogOpen(true)
  }, [])

  const columns = flowsColumns({ onView: handleView })

  // Initial fetch - only on mount with ref guard for React StrictMode
  const initialized = useRef(false)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      handleApplyFilters(filters)
    }
  }, [])

  return (
    <BaseLayout title="流水管理" description="查看所有用户的账户流水记录">
      <div className="flex flex-col gap-4">
        {/* Filters */}
        <div className="px-4 lg:px-6">
          <FlowFilters onFilterChange={handleFilterChange} onSearch={handleApplyFilters} onReset={handleApplyFilters} initialFilters={filters} />
        </div>

        {/* Table */}
        <div className="px-4 lg:px-6">
          <DataTable
            columns={columns}
            data={flows}
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
      <FlowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        flow={selectedFlow}
      />
    </BaseLayout>
  )
}
