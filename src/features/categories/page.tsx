"use client"

import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { CategoryTree } from "./components/CategoryTree"
import { CategoryForm } from "./components/CategoryForm"
import { useCategories, useCategoryCreate, useCategoryUpdate, useCategoryDelete } from "./hooks/use-categories"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { ContentCategory, CategoryTreeNode, CategoryLayer } from "./types"

export default function CategoriesManagementPage() {
  const { categories, loading, fetchCategories } = useCategories()
  const { createCategory, loading: createLoading, error: createError } = useCategoryCreate()
  const { updateCategory, loading: updateLoading, error: updateError } = useCategoryUpdate()
  const { deleteCategory, loading: deleteLoading, error: deleteError } = useCategoryDelete()

  const [formOpen, setFormOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null)
  const [parentForNew, setParentForNew] = useState<{ code: string | null; layer: CategoryLayer } | null>(null)

  // Build tree structure from flat list
  const buildTree = (cats: ContentCategory[]): CategoryTreeNode[] => {
    const map = new Map<string, CategoryTreeNode>()
    const roots: CategoryTreeNode[] = []

    // First pass: create nodes
    cats.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] })
    })

    // Second pass: build tree
    cats.forEach((cat) => {
      const node = map.get(cat.id)!
      if (cat.parentCode) {
        const parent = Array.from(map.values()).find((n) => n.code === cat.parentCode)
        if (parent) {
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleEdit = (category: ContentCategory) => {
    setSelectedCategory(category)
    setParentForNew(null)
    setFormOpen(true)
  }

  const handleAddChild = (parent: ContentCategory) => {
    setSelectedCategory(null)
    setParentForNew({ code: parent.code, layer: parent.layer })
    setFormOpen(true)
  }

  const handleAddRoot = () => {
    setSelectedCategory(null)
    setParentForNew(null)
    setFormOpen(true)
  }

  const handleDelete = async (category: ContentCategory) => {
    if (!confirm(`确定要删除分类"${category.name}"吗？`)) return
    try {
      await deleteCategory(category.id)
      fetchCategories()
    } catch (error) {
      console.error("Delete failed:", error)
    }
  }

  const handleSubmit = async (data: Parameters<typeof createCategory>[0] | Parameters<typeof updateCategory>[1]) => {
    try {
      if (selectedCategory) {
        await updateCategory(selectedCategory.id, data as Parameters<typeof updateCategory>[1])
      } else {
        await createCategory(data as Parameters<typeof createCategory>[0])
      }
      setFormOpen(false)
      fetchCategories()
    } catch (error) {
      console.error("Submit failed:", error)
    }
  }

  const treeData = buildTree(categories)
  const currentError = createError || updateError || deleteError

  return (
    <BaseLayout title="分类管理" description="管理内容分类体系">
      <div className="px-4 lg:px-6">
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground">
            共 {categories.length} 个分类
          </div>
          <Button onClick={handleAddRoot} className="cursor-pointer">
            <Plus className="size-4 mr-2" />
            添加分类
          </Button>
        </div>

        {/* Error Display */}
        {currentError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {currentError}
          </div>
        )}

        {/* Tree View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tree Section */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <h3 className="font-medium">分类树</h3>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : treeData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无分类数据
                </div>
              ) : (
                <CategoryTree
                  nodes={treeData}
                  onSelect={(node) => {
                    // Select for editing
                    setSelectedCategory(node)
                    setParentForNew(null)
                  }}
                />
              )}
            </div>
          </div>

          {/* Category List Section */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <h3 className="font-medium">分类列表</h3>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-2 px-3 text-left font-medium text-sm">名称</th>
                      <th className="py-2 px-3 text-left font-medium text-sm">代码</th>
                      <th className="py-2 px-3 text-left font-medium text-sm">层级</th>
                      <th className="py-2 px-3 text-left font-medium text-sm">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3">
                          <span className="font-medium">{category.name}</span>
                        </td>
                        <td className="py-2 px-3">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{category.code}</code>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                            category.layer === 'carrier' ? 'bg-blue-100 text-blue-800' :
                            category.layer === 'info_type' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {category.layer}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(category)}
                              className="h-7 px-2 cursor-pointer"
                            >
                              编辑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddChild(category)}
                              className="h-7 px-2 cursor-pointer"
                            >
                              添加子分类
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(category)}
                              className="h-7 px-2 text-destructive hover:text-destructive cursor-pointer"
                            >
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Category Form Dialog */}
        <CategoryForm
          open={formOpen}
          onOpenChange={setFormOpen}
          category={selectedCategory}
          parentCode={parentForNew?.code}
          layer={parentForNew?.layer}
          loading={createLoading || updateLoading}
          error={currentError}
          onSubmit={handleSubmit}
        />
      </div>
    </BaseLayout>
  )
}