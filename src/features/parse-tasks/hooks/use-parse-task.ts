"use client"

import { create } from 'zustand'
import { parseTaskApi } from "../services/parse-task"
import type { ParseTaskItem, ParseTaskDetail, VersionItem, VersionFile } from "../types"

interface ParseTaskState {
  // Task list
  tasks: ParseTaskItem[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  filterParams: { source?: string; status?: string }

  // Task detail
  selectedTask: ParseTaskDetail | null
  detailLoading: boolean

  // Versions
  versions: VersionItem[]
  versionsLoading: boolean

  // Version files
  versionFiles: VersionFile[]
  versionFilesLoading: boolean

  // Dialog states
  createDialogOpen: boolean
  detailDialogOpen: boolean

  // Actions
  fetchTasks: (params?: { source?: string; status?: string }) => Promise<void>
  fetchTask: (taskId: string) => Promise<void>
  createTask: (data: { source: string; version: string; source_file_key: string; execute_immediately?: boolean }) => Promise<void>
  executeTask: (taskId: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  fetchVersions: (params?: { source?: string }) => Promise<void>
  fetchVersionFiles: (source: string, version: string) => Promise<void>
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setCreateDialogOpen: (open: boolean) => void
  setDetailDialogOpen: (open: boolean) => void
  setSelectedTask: (task: ParseTaskDetail | null) => void
  resetFilters: () => void
}

export const useParseTaskStore = create<ParseTaskState>((set, get) => ({
  // Initial state
  tasks: [],
  loading: false,
  error: null,
  pagination: {
    page: 0,
    pageSize: 50,
    total: 0,
  },
  filterParams: {},
  selectedTask: null,
  detailLoading: false,
  versions: [],
  versionsLoading: false,
  versionFiles: [],
  versionFilesLoading: false,
  createDialogOpen: false,
  detailDialogOpen: false,

  // Fetch task list
  fetchTasks: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const { pagination, filterParams } = get()
      const currentParams = Object.keys(params).length > 0 ? params : filterParams
      set({ filterParams: currentParams as typeof filterParams })

      // UI uses 0-based pagination, API uses 1-based
      const page = pagination.page + 1

      const response = await parseTaskApi.getTasks({
        ...currentParams,
        limit: pagination.pageSize,
        offset: (page - 1) * pagination.pageSize,
      })

      set({
        tasks: response.items,
        pagination: {
          ...pagination,
          total: response.total,
        },
        loading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch tasks",
        loading: false,
      })
    }
  },

  // Fetch single task
  fetchTask: async (taskId: string) => {
    set({ detailLoading: true, error: null })
    try {
      const task = await parseTaskApi.getTask(taskId)
      set({ selectedTask: task, detailLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch task",
        detailLoading: false,
      })
    }
  },

  // Create task
  createTask: async (data) => {
    set({ loading: true, error: null })
    try {
      await parseTaskApi.createTask(data)
      set({ createDialogOpen: false, loading: false })
      // Refresh task list
      get().fetchTasks()
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to create task",
        loading: false,
      })
      throw err
    }
  },

  // Execute task
  executeTask: async (taskId: string) => {
    set({ loading: true, error: null })
    try {
      await parseTaskApi.executeTask(taskId)
      set({ loading: false })
      // Refresh task list
      get().fetchTasks()
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to execute task",
        loading: false,
      })
      throw err
    }
  },

  // Delete task
  deleteTask: async (taskId: string) => {
    set({ loading: true, error: null })
    try {
      await parseTaskApi.deleteTask(taskId)
      set({ loading: false })
      // Refresh task list
      get().fetchTasks()
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete task",
        loading: false,
      })
      throw err
    }
  },

  // Fetch versions
  fetchVersions: async (params = {}) => {
    set({ versionsLoading: true, error: null })
    try {
      const response = await parseTaskApi.getVersions(params)
      set({ versions: response.versions, versionsLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch versions",
        versionsLoading: false,
      })
    }
  },

  // Fetch version files
  fetchVersionFiles: async (source: string, version: string) => {
    set({ versionFilesLoading: true, error: null })
    try {
      const response = await parseTaskApi.getVersionFiles(source, version)
      set({ versionFiles: response.files, versionFilesLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch version files",
        versionFilesLoading: false,
      })
    }
  },

  // Pagination
  setPage: (page) => {
    set(state => ({
      pagination: { ...state.pagination, page }
    }))
    get().fetchTasks()
  },

  setPageSize: (pageSize) => {
    set(state => ({
      pagination: { ...state.pagination, pageSize, page: 0 }
    }))
    get().fetchTasks()
  },

  // Dialog controls
  setCreateDialogOpen: (open) => set({ createDialogOpen: open }),
  setDetailDialogOpen: (open) => set({ detailDialogOpen: open }),
  setSelectedTask: (task) => set({ selectedTask: task }),

  // Reset filters
  resetFilters: () => {
    set({ filterParams: {}, pagination: { ...get().pagination, page: 0 } })
    get().fetchTasks({})
  },
}))