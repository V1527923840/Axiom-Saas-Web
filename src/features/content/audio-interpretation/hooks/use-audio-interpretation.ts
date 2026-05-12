"use client"

import { create } from 'zustand'
import type { AudioInterpretationItem } from '@/features/content/types'
import { contentApi } from '@/services/content'

interface AudioInterpretationState {
  items: AudioInterpretationItem[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  selectedItem: AudioInterpretationItem | null
  detailDialogOpen: boolean

  fetchItems: () => Promise<void>
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  openDetail: (item: AudioInterpretationItem) => void
  closeDetail: () => void
}

export const useAudioInterpretationStore = create<AudioInterpretationState>((set, get) => ({
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
      const response = await contentApi.getAudioInterpretation(pagination.page + 1, pagination.pageSize)
      set({
        items: response.data || [],
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
