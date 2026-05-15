"use client"

import { create } from 'zustand'
import { scrapeLogApi } from "../services/scrape-log"
import type { ScrapeLogItem } from "../types"

interface ScrapeLogState {
  logs: ScrapeLogItem[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  selectedItem: ScrapeLogItem | null
  detailDialogOpen: boolean
  filterParams: { status?: string; source?: string }

  fetchLogs: (params?: { status?: string; source?: string }) => Promise<void>
  getLog: (id: string) => Promise<ScrapeLogItem | null>
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  openDetail: (item: ScrapeLogItem) => void
  closeDetail: () => void
}

export const useScrapeLogStore = create<ScrapeLogState>((set, get) => ({
  logs: [],
  loading: false,
  error: null,
  pagination: {
    page: 0,
    pageSize: 10,
    total: 0,
  },
  selectedItem: null,
  detailDialogOpen: false,
  filterParams: {},

  fetchLogs: async (params = {}) => {
    const currentFilterParams = Object.keys(params).length > 0 ? params : get().filterParams
    set({ loading: true, error: null, filterParams: currentFilterParams })
    try {
      const { pagination } = get()
      const page = Number.isInteger(pagination.page) && pagination.page >= 0 ? pagination.page + 1 : 1
      const pageSize = Number.isInteger(pagination.pageSize) && pagination.pageSize > 0 ? pagination.pageSize : 10
      const token = localStorage.getItem("auth_token")

      const response = await scrapeLogApi.getScrapeLogs(page, pageSize, currentFilterParams, token)

      // response.data is the array directly, response.total/page/pageSize are siblings
      const logsArray = Array.isArray(response.data) ? response.data : []
      const totalCount = (response as any).total ?? 0
      const pageNum = (response as any).page ?? page
      const pageSizeNum = (response as any).pageSize ?? pageSize

      set({
        logs: logsArray,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: totalCount,
        },
        loading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch logs",
        loading: false,
      })
    }
  },

  getLog: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem("auth_token")
      const response = await scrapeLogApi.getScrapeLog(id, token)
      return response.data
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to get log",
        loading: false,
      })
      return null
    } finally {
      set({ loading: false })
    }
  },

  setPage: (page) => {
    const newPage = typeof page === 'number' && page >= 0 ? page : 0
    set(state => ({
      pagination: { ...state.pagination, page: newPage }
    }))
    get().fetchLogs()
  },

  setPageSize: (pageSize) => {
    const newPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10
    set(state => ({
      pagination: { ...state.pagination, pageSize: newPageSize, page: 0 }
    }))
    get().fetchLogs()
  },

  openDetail: (item) => set({ selectedItem: item, detailDialogOpen: true }),
  closeDetail: () => set({ selectedItem: null, detailDialogOpen: false }),
}))