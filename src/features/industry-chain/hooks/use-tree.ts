// src/features/industry-chain/hooks/use-tree.ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { industryChainApi } from "../services/api"
import type {
  ChainItem,
  L1Item,
  L2Item,
  VersionItem,
} from "../types"

export type TreeLevel = 1 | 2 | 3 | 4

export interface TreeNode {
  id: string
  level: TreeLevel
  code: string
  name: string
  createTime?: string
  qiniuUrl?: string
  versionCount?: number
  children?: TreeNode[]
  loading?: boolean
  error?: string
}

interface PreviewState {
  open: boolean
  chainName: string
  version: number
  qiniuUrl: string
}

export function useTree() {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loadingL1, setLoadingL1] = useState(false)
  const [l1Error, setL1Error] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<PreviewState>({
    open: false,
    chainName: "",
    version: 0,
    qiniuUrl: "",
  })

  // Mirror the latest `tree` so async callbacks (toggle) can read fresh state
  // without having `tree` in their useCallback deps, which would otherwise
  // tear down the callback between renders and let a stale closure trigger
  // a duplicate lazy-load request.
  const treeRef = useRef<TreeNode[]>(tree)
  useEffect(() => {
    treeRef.current = tree
  }, [tree])

  const fetchL1 = useCallback(async () => {
    setLoadingL1(true)
    setL1Error(null)
    try {
      const res = await industryChainApi.getL1List()
      const items = Array.isArray(res.data?.data) ? res.data.data : []
      setTree(
        items.map((it: L1Item) => ({
          id: `1-${it.code}`,
          level: 1 as const,
          code: it.code,
          name: `${it.code} ${it.name}`,
          versionCount: it.chainCount,
        })),
      )
    } catch (err) {
      setL1Error(err instanceof Error ? err.message : "加载一级行业失败")
    } finally {
      setLoadingL1(false)
    }
  }, [])

  const setChildrenFor = useCallback(
    (parentId: string, children: TreeNode[]) => {
      const update = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map((n) => {
          if (n.id === parentId) {
            return { ...n, children, loading: false, error: undefined }
          }
          if (n.children) {
            return { ...n, children: update(n.children) }
          }
          return n
        })
      setTree((prev) => update(prev))
    },
    [],
  )

  const setNodeLoading = useCallback((id: string, loading: boolean) => {
    const update = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((n) => {
        if (n.id === id) return { ...n, loading }
        if (n.children) return { ...n, children: update(n.children) }
        return n
      })
    setTree((prev) => update(prev))
  }, [])

  const setNodeError = useCallback((id: string, error: string) => {
    const update = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((n) => {
        if (n.id === id) return { ...n, loading: false, error }
        if (n.children) return { ...n, children: update(n.children) }
        return n
      })
    setTree((prev) => update(prev))
  }, [])

  const loadL2 = useCallback(
    async (l1: TreeNode) => {
      if (loadedIds.has(l1.id)) return
      setNodeLoading(l1.id, true)
      try {
        const res = await industryChainApi.getL2List(l1.code)
        const items: L2Item[] = Array.isArray(res.data?.data) ? res.data.data : []
        setChildrenFor(
          l1.id,
          items.map((it) => ({
            id: `2-${l1.code}-${it.code}`,
            level: 2 as const,
            code: it.code,
            name: `${it.code} ${it.name}`,
            versionCount: it.chainCount,
          })),
        )
        setLoadedIds((prev) => new Set(prev).add(l1.id))
      } catch (err) {
        setNodeError(
          l1.id,
          err instanceof Error ? err.message : "加载二级行业失败",
        )
      }
    },
    [loadedIds, setChildrenFor, setNodeError, setNodeLoading],
  )

  const loadChains = useCallback(
    async (l2: TreeNode) => {
      if (loadedIds.has(l2.id)) return
      setNodeLoading(l2.id, true)
      try {
        const res = await industryChainApi.getChains(l2.code)
        const items: ChainItem[] = Array.isArray(res.data?.data)
          ? res.data.data
          : []
        setChildrenFor(
          l2.id,
          items.map((it) => ({
            id: `3-${l2.code}-${it.slug}`,
            level: 3 as const,
            code: it.slug,
            name: it.name,
            createTime: it.createTime,
            versionCount: it.versionCount,
          })),
        )
        setLoadedIds((prev) => new Set(prev).add(l2.id))
      } catch (err) {
        setNodeError(
          l2.id,
          err instanceof Error ? err.message : "加载产业链失败",
        )
      }
    },
    [loadedIds, setChildrenFor, setNodeError, setNodeLoading],
  )

  const loadVersions = useCallback(
    async (chain: TreeNode) => {
      if (loadedIds.has(chain.id)) return
      setNodeLoading(chain.id, true)
      try {
        const res = await industryChainApi.getVersions(chain.code)
        const items: VersionItem[] = Array.isArray(res.data?.data)
          ? res.data.data
          : []
        setChildrenFor(
          chain.id,
          items.map((it) => ({
            id: `4-${chain.code}-${it.version}`,
            level: 4 as const,
            code: String(it.version),
            name: `v${it.version}`,
            createTime: it.createTime,
            qiniuUrl: it.qiniuUrl,
          })),
        )
        setLoadedIds((prev) => new Set(prev).add(chain.id))
      } catch (err) {
        setNodeError(
          chain.id,
          err instanceof Error ? err.message : "加载版本失败",
        )
      }
    },
    [loadedIds, setChildrenFor, setNodeError, setNodeLoading],
  )

  const toggle = useCallback(
    async (id: string) => {
      const find = (nodes: TreeNode[]): TreeNode | null => {
        for (const n of nodes) {
          if (n.id === id) return n
          if (n.children) {
            const found = find(n.children)
            if (found) return found
          }
        }
        return null
      }
      const node = find(treeRef.current)
      if (!node) return

      if (expandedIds.has(id)) {
        setExpandedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        return
      }

      setExpandedIds((prev) => new Set(prev).add(id))

      if (loadedIds.has(id)) return

      if (node.level === 1) await loadL2(node)
      else if (node.level === 2) await loadChains(node)
      else if (node.level === 3) await loadVersions(node)
    },
    [expandedIds, loadedIds, loadL2, loadChains, loadVersions],
  )

  const openPreview = useCallback((node: TreeNode) => {
    if (!node.qiniuUrl) return
    const findParent = (
      nodes: TreeNode[],
      target: TreeNode,
    ): TreeNode | null => {
      for (const n of nodes) {
        if (n.children?.some((c) => c.id === target.id)) return n
        if (n.children) {
          const found = findParent(n.children, target)
          if (found) return found
        }
      }
      return null
    }
    const parent = findParent(tree, node)
    setPreview({
      open: true,
      chainName: parent?.name ?? node.name,
      version: Number(node.code),
      qiniuUrl: node.qiniuUrl!,
    })
  }, [tree])

  const closePreview = useCallback(() => {
    setPreview((prev) => ({ ...prev, open: false }))
  }, [])

  return {
    tree,
    loadingL1,
    l1Error,
    expandedIds,
    toggle,
    openPreview,
    closePreview,
    preview,
    fetchL1,
  }
}
