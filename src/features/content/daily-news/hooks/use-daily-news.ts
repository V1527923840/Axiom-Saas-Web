"use client"

import { create } from 'zustand'
import type { DailyNewsItem } from '@/features/content/types'
import { contentApi } from '@/services/content'

interface DailyNewsState {
  items: DailyNewsItem[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  selectedItem: DailyNewsItem | null
  detailDialogOpen: boolean

  fetchItems: () => Promise<void>
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  openDetail: (item: DailyNewsItem) => void
  closeDetail: () => void
}

export const useDailyNewsStore = create<DailyNewsState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  pagination: {
    page: 0,
    pageSize: 10,
    total: 0,
  },
  selectedItem: null,
  detailDialogOpen: false,

  fetchItems: async () => {
    set({ loading: true, error: null })
    try {
      const { pagination } = get()
      const response = await contentApi.getDailyNews(pagination.page + 1, pagination.pageSize)
      set({
        items: response.data,
        pagination: {
          ...pagination,
          total: response.total || 0,
        },
        loading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch items',
        loading: false,
      })
    }
  },

  setPage: (page) => {
    set(state => ({
      pagination: { ...state.pagination, page }
    }))
    get().fetchItems()
  },

  setPageSize: (pageSize) => {
    set(state => ({
      pagination: { ...state.pagination, pageSize, page: 0 }
    }))
    get().fetchItems()
  },

  openDetail: (item) => set({ selectedItem: item, detailDialogOpen: true }),
  closeDetail: () => set({ selectedItem: null, detailDialogOpen: false }),
}))
