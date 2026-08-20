/**
 * SkillUploadDialog — 上传 Skill 弹窗。
 *
 * Phase 0 (本地):选择文件 → normalize → 算 hash
 * Phase 1 (server):申请 uploadUrl
 * Phase 1.5 (browser → Qiniu):PUT 上传
 * Phase 2 (server):确认上传(后端从文件名/hashed id 生成 code)
 *
 * 通过 useSkillUpload hook 驱动。
 *
 * UX (per 2026-08-18 重构):
 *   - 不再切单 .md / .zip — 自动按后缀识别
 *   - 文件区域是 drag-and-drop 样式,匹配 @Axiom/workspace/upload.png
 *   - code 字段不展示,后端从 hash 自动生成
 *   - "名称"、"描述" 中文标签
 *   - changelog 字段删除
 *   - "分类"必填(预设为 宏观 / 行业 / 量化)
 */
import { useRef, useState } from "react"
import JSZip from "jszip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CloudUpload,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSkillUpload } from "../hooks/use-skill-upload"
import type { UploadSourceFormat } from "../types"
import { FrontmatterPreview } from "./skill-frontmatter-preview"
import { parseSkillMd } from "../lib/frontmatter"
import { PREDEFINED_CATEGORIES } from "../lib/categories"

interface SkillUploadDialogProps {
  trigger?: React.ReactNode
  onSuccess?: (skillId: string) => void
  // ★ 受控开关 — 由父组件管理 open 状态(适配 /skills 广场按钮直接弹窗)
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// 根据文件名后缀推断 source format;非法后缀返回 null。
function detectFormat(name: string): UploadSourceFormat | null {
  const lower = name.toLowerCase()
  if (lower.endsWith(".md")) return "md"
  if (lower.endsWith(".zip")) return "zip"
  return null
}

export function SkillUploadDialog({
  trigger,
  onSuccess,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: SkillUploadDialogProps) {
  const [openInternal, setOpenInternal] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : openInternal
  const setOpen = (v: boolean) => {
    if (!isControlled) setOpenInternal(v)
    onOpenChangeProp?.(v)
  }

  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<UploadSourceFormat | null>(null)
  const [previewMd, setPreviewMd] = useState<string>("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  // ★ 分类必填 — 默认空字符串,提交按钮在空时禁用
  const [category, setCategory] = useState<string>("")
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const upload = useSkillUpload({
    onSuccess: (r) => {
      onSuccess?.(r.skillId)
      setOpen(false)
      resetForm()
    },
  })

  function resetForm() {
    setFile(null)
    setFormat(null)
    setPreviewMd("")
    setName("")
    setDescription("")
    setCategory("")
    upload.reset()
  }

  async function onPickFile(picked: File | null) {
    if (!picked) {
      setFile(null)
      setFormat(null)
      setPreviewMd("")
      return
    }
    const detected = detectFormat(picked.name)
    if (!detected) {
      // 用原生 setTimeout 把 state 重置推进下一个 microtask,避免和外部错误处理打架
      setTimeout(() => {
        window.alert(
          `不支持的文件类型: ${picked.name}\n请上传 .md 或 .zip 文件`,
        )
      }, 0)
      return
    }
    setFile(picked)
    setFormat(detected)
    if (detected === "md") {
      const text = await picked.text()
      setPreviewMd(text)
      try {
        const parsed = parseSkillMd(text)
        // 自动填充,但不覆盖用户已填的值
        if (!name) setName(parsed.frontmatter.name)
        if (!description) setDescription(parsed.frontmatter.description)
      } catch {
        // frontmatter 错误由后端 Phase 2 拦
      }
    } else {
      setPreviewMd("")
      // ★ zip 模式也读 <slug>/SKILL.md frontmatter 自动填 name/description
      // — 跟 .md 模式 UX 一致:用户没填就用 frontmatter,已填的不覆盖。
      // zip 解析失败 / 没有 SKILL.md 时静默跳过(后端 Phase 2 会给精确错误)
      try {
        const buf = await picked.arrayBuffer()
        const zip = await JSZip.loadAsync(buf)
        // 找顶层目录(spec §2.1 强制单顶层)
        const topDir = Object.keys(zip.files)
          .filter((p) => !zip.files[p].dir)
          .map((p) => p.split("/")[0])
          .find((v, i, arr) => arr.indexOf(v) === i)
        if (topDir) {
          const skillMdEntry = zip.file(`${topDir}/SKILL.md`)
          if (skillMdEntry) {
            const text = await skillMdEntry.async("string")
            const parsed = parseSkillMd(text)
            if (!name) setName(parsed.frontmatter.name)
            if (!description) setDescription(parsed.frontmatter.description)
          }
        }
      } catch {
        // 静默吞 — 后端会有更精确的报错
      }
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) onPickFile(dropped)
  }

  async function onSubmit() {
    if (!file || !format) return
    try {
      // code 字段不在 UI 上填写 — 不发送,让后端从 name + hash 自己派生。
      // 关键:必须传 undefined(或省略)而不是空串 — 后端 @IsOptional 不会
      // 把 "" 当作"可选",会触发 @Length(1, 64) 校验失败。
      await upload.mutateAsync({
        file,
        format,
        name,
        description,
        changelog: undefined,
        category: category || undefined,
      })
    } catch (e) {
      // 错误显示在下面
    }
  }

  const progressLabel = ["", "本地打包…", "上传七牛云…", "确认…"][upload.progress] ?? ""
  const inFlight = upload.progress > 0
  // ★ spec §2.3: category 可选,不再阻塞提交
  const submitDisabled =
    !file || !format || !name || !description || inFlight

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) resetForm()
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <UploadCloud className="mr-2 h-4 w-4" />
            上传 Skill
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>上传 Skill</DialogTitle>
          <DialogDescription>
            选择一个 .md 文档或完整 .zip,后端会打包校验后发布。
          </DialogDescription>
        </DialogHeader>

        {/* ★ 文件拖拽区域 — 仿 upload.png 的 dashed border + icon 样式 */}
        {file ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{file.name}</span>
              <span className="text-muted-foreground">
                ({(file.size / 1024).toFixed(1)} KB · {format?.toUpperCase()})
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onPickFile(null)}
              disabled={inFlight}
              aria-label="移除文件"
              className="cursor-pointer"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed bg-muted/20 px-6 py-10 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-primary/50",
            )}
          >
            <CloudUpload className="size-8 text-primary" />
            <p className="text-sm font-medium">
              点击或将文件拖拽到此区域上传
            </p>
            <p className="text-xs text-muted-foreground">
              支持单个 .md(单文件)或 .zip(含 SKILL.md + files/);系统会按后缀自动识别
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".md,.zip,application/zip"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              disabled={inFlight}
            />
          </div>
        )}

        {previewMd && <FrontmatterPreview md={previewMd} />}

        {/* ★ 元数据 — 名称 / 描述(中文标签);code 不再展示 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="skill-name">名称</Label>
            <Input
              id="skill-name"
              placeholder="财报基础"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={inFlight}
            />
          </div>
          <div className="space-y-2">
            {/* ★ spec §2.3: category 改为可选。不再标 * 必填,
                placeholder 表达「不限分类」语义,空串走 undefined
                传给后端(@IsOptional 能接)。 */}
            <Label htmlFor="skill-category">分类</Label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={inFlight}
            >
              <SelectTrigger id="skill-category" className="cursor-pointer">
                <SelectValue placeholder="不限分类" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="cursor-pointer">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="skill-desc">描述</Label>
          <Textarea
            id="skill-desc"
            placeholder="skill 用途简述,会被 AI 用于自动匹配"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={inFlight}
          />
        </div>

        {upload.error && (
          <Alert variant="destructive">
            <AlertDescription>{(upload.error as Error).message}</AlertDescription>
          </Alert>
        )}
        {inFlight && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progressLabel}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={inFlight} className="cursor-pointer">
            取消
          </Button>
          <Button onClick={onSubmit} disabled={submitDisabled} className="cursor-pointer">
            {inFlight && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}