"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { ContentCategory, CreateCategoryRequest, UpdateCategoryRequest, CategoryLayer } from "../types"

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: ContentCategory | null
  parentCode?: string | null
  layer?: CategoryLayer
  loading: boolean
  error: string | null
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => void
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
  parentCode,
  layer,
  loading,
  error,
  onSubmit,
}: CategoryFormProps) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [selectedLayer, setSelectedLayer] = useState<CategoryLayer>(layer || "info_type")
  const [selectedParentCode, setSelectedParentCode] = useState<string>("")
  const [description, setDescription] = useState("")
  const [sortOrder, setSortOrder] = useState<number>(0)
  const [isActive, setIsActive] = useState(true)

  const isEdit = !!category

  useEffect(() => {
    if (category) {
      setName(category.name)
      setCode(category.code)
      setSelectedLayer(category.layer)
      setSelectedParentCode(category.parentCode || "")
      setDescription(category.description || "")
      setSortOrder(category.sortOrder)
      setIsActive(category.isActive)
    } else {
      setName("")
      setCode("")
      setSelectedLayer(layer || "info_type")
      setSelectedParentCode(parentCode || "")
      setDescription("")
      setSortOrder(0)
      setIsActive(true)
    }
  }, [category, parentCode, layer, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit && category) {
      onSubmit({
        name,
        description,
        sortOrder,
        isActive,
      } as UpdateCategoryRequest)
    } else {
      onSubmit({
        name,
        code,
        layer: selectedLayer,
        parentCode: selectedParentCode || null,
        description,
        sortOrder,
        isActive,
      } as CreateCategoryRequest)
    }
  }

  const layerOptions: { value: CategoryLayer; label: string }[] = [
    { value: "carrier", label: "信息载体 (carrier)" },
    { value: "info_type", label: "信息类型 (info_type)" },
    { value: "financial", label: "金融维度 (financial)" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑分类" : "创建分类"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改分类信息" : "创建新的内容分类"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">分类名称 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：研报类"
              required
            />
          </div>

          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">分类代码 *</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="例如：RESEARCH_REPORT"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="layer">分类层级 *</Label>
                <Select value={selectedLayer} onValueChange={(value) => setSelectedLayer(value as CategoryLayer)}>
                  <SelectTrigger id="layer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {layerOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentCode">上级分类</Label>
                <Input
                  id="parentCode"
                  value={selectedParentCode}
                  onChange={(e) => setSelectedParentCode(e.target.value)}
                  placeholder="上级分类代码（可选）"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="分类描述（可选）"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">排序</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isActive">启用此分类</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="cursor-pointer"
            >
              取消
            </Button>
            <Button type="submit" disabled={loading} className="cursor-pointer">
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  {isEdit ? "保存中..." : "创建中..."}
                </>
              ) : (
                isEdit ? "保存" : "创建"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}