import { useState, useEffect, useCallback } from "react"
import type {
  PaginationState,
  SortingState,
  FetchData,
  FetchDataParams,
  FetchDataResult,
} from "./types"

export interface UseDataTableOptions<TData> {
  fetchData: FetchData<TData>
  pageSize?: number
}

export interface UseDataTableReturn<TData> {
  data: TData[]
  total: number
  isLoading: boolean
  error: Error | null
  pagination: PaginationState
  sorting: SortingState[]
  globalFilter: string
  setPagination: (pagination: PaginationState | ((prev: PaginationState) => PaginationState)) => void
  setSorting: (sorting: SortingState[] | ((prev: SortingState[]) => SortingState[])) => void
  setGlobalFilter: (filter: string) => void
  refresh: () => void
}

export function useDataTable<TData extends Record<string, unknown>>({
  fetchData,
  pageSize = 10,
}: UseDataTableOptions<TData>): UseDataTableReturn<TData> {
  const [data, setData] = useState<TData[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })
  const [sorting, setSorting] = useState<SortingState[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: FetchDataParams = {
        pagination,
        sorting,
        globalFilter,
      }
      const result: FetchDataResult<TData> = await fetchData(params)
      setData(result.data)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch data"))
    } finally {
      setIsLoading(false)
    }
  }, [fetchData, pagination, sorting, globalFilter, refreshTrigger])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    total,
    isLoading,
    error,
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
    refresh,
  }
}