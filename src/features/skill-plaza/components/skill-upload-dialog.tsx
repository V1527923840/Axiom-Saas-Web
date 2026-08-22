/**
 * SkillUploadDialog — 上传 / 更新 Skill 弹窗(同一组件双模式)。
 *
 * Phase 0 (本地):选择文件 → normalize → 算 hash
 * Phase 1 (server):申请 uploadUrl
 * Phase 1.5 (browser → Qiniu):PUT 上传
 * Phase 2 (server):确认上传(后端从文件名/hashed id 生成 code)
 *
 * mode="upload"(默认) → useSkillUpload
 * mode="update"       → useSkillUpdate(skill),要求传 skill
 *
 * UX:
 *   - 文件区域是 drag-and-drop 样式
 *   - code 字段不展示,后端从 hash 自动生成
 *   - "分类" 改为可选
 *   - update 模式 changelog 字段必填(带红 *)
 *
 * 实现:Dialog 外层管理 open;DialogContent 内的 body 根据 mode 拆成
 * UploadDialogBody / UpdateDialogBody 两个独立组件,各自持有表单 state
 * 并调用对应 hook。这样 hook 调用次数随 mode 固定,满足 Rules of Hooks。
 */
import { useEffect, useRef, useState } from "react"
import JSZip from "jszip"
import {
  Dialog,
  DialogClose,
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
import { useSkillUpdate } from "../hooks/use-skill-update"
import type { Skill } from "@/types/skill"
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
  // ★ NEW:支持 update 模式 — 复用同一个 dialog
  mode?: "upload" | "update"
  // mode="update" 时必填
  skill?: Skill
}

// 根据文件名后缀推断 source format;非法后缀返回 null。
function detectFormat(name: string): UploadSourceFormat | null {
  const lower = name.toLowerCase()
  if (lower.endsWith(".md")) return "md"
  if (lower.endsWith(".zip")) return "zip"
  return null
}

export function SkillUploadDialog(props: SkillUploadDialogProps) {
  const {
    trigger,
    onSuccess,
    open: openProp,
    onOpenChange: onOpenChangeProp,
    mode = "upload",
    skill,
  } = props
  const [openInternal, setOpenInternal] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : openInternal
  const setOpen = (v: boolean) => {
    if (!isControlled) setOpenInternal(v)
    onOpenChangeProp?.(v)
  }

  const isUpdate = mode === "update"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <UploadCloud className="mr-2 h-4 w-4" />
            {isUpdate ? "更新 Skill" : "上传 Skill"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isUpdate ? "更新 Skill" : "上传 Skill"}</DialogTitle>
          <DialogDescription>
            {isUpdate
              ? "上传替换原 Skill 的内容(保留 code/版本号/历史)。更新说明必填。"
              : "选择一个 .md 文档或完整 .zip,后端会打包校验后发布。"}
          </DialogDescription>
        </DialogHeader>

        {isUpdate && skill ? (
          <UpdateDialogBody
            skill={skill}
            onSuccess={(id) => {
              onSuccess?.(id)
              setOpen(false)
            }}
          />
        ) : (
          <UploadDialogBody
            onSuccess={(id) => {
              onSuccess?.(id)
              setOpen(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// =============================================================
// 共享 UI fragment — 抽出来减少重复
// =============================================================
interface FormFieldsProps {
  file: File | null
  format: UploadSourceFormat | null
  previewMd: string
  name: string
  setName: (s: string) => void
  description: string
  setDescription: (s: string) => void
  category: string
  setCategory: (s: string) => void
  changelog: string
  setChangelog: (s: string) => void
  isUpdate: boolean
  inFlight: boolean
  onPickFile: (f: File | null) => void
  dragOver: boolean
  setDragOver: (v: boolean) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

function FormFields(p: FormFieldsProps) {
  return (
    <>
      {/* ★ 文件拖拽区域 — 仿 upload.png 的 dashed border + icon 样式 */}
      {p.file ? (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{p.file.name}</span>
            <span className="text-muted-foreground">
              ({(p.file.size / 1024).toFixed(1)} KB · {p.format?.toUpperCase()})
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => p.onPickFile(null)}
            disabled={p.inFlight}
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
          onClick={() => p.fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              p.fileInputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            p.setDragOver(true)
          }}
          onDragLeave={() => p.setDragOver(false)}
          onDrop={p.onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed bg-muted/20 px-6 py-10 text-center transition-colors",
            p.dragOver
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
            ref={p.fileInputRef}
            type="file"
            accept=".md,.zip,application/zip"
            className="hidden"
            onChange={(e) => p.onPickFile(e.target.files?.[0] ?? null)}
            disabled={p.inFlight}
          />
        </div>
      )}

      {p.previewMd && <FrontmatterPreview md={p.previewMd} />}

      {/* ★ 元数据 — 名称 / 描述(中文标签);code 不再展示 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="skill-name">名称</Label>
          <Input
            id="skill-name"
            placeholder="财报基础"
            value={p.name}
            onChange={(e) => p.setName(e.target.value)}
            disabled={p.inFlight}
          />
        </div>
        <div className="space-y-2">
          {/* ★ spec §2.3: category 改为可选 */}
          <Label htmlFor="skill-category">分类</Label>
          <Select
            value={p.category}
            onValueChange={p.setCategory}
            disabled={p.inFlight}
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
          value={p.description}
          onChange={(e) => p.setDescription(e.target.value)}
          rows={3}
          disabled={p.inFlight}
        />
      </div>

      {/* ★ changelog 字段 — update 模式必填(带红 *) */}
      <div className="space-y-2">
        <Label htmlFor="skill-changelog">
          更新说明{p.isUpdate && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="skill-changelog"
          value={p.changelog}
          onChange={(e) => p.setChangelog(e.target.value)}
          required={p.isUpdate}
          placeholder={p.isUpdate ? "本次更新做了什么(必填)" : "可选"}
          disabled={p.inFlight}
        />
      </div>
    </>
  )
}

// =============================================================
// UploadDialogBody — mode="upload"
// =============================================================
function UploadDialogBody({ onSuccess }: { onSuccess: (skillId: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<UploadSourceFormat | null>(null)
  const [previewMd, setPreviewMd] = useState<string>("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string>("")
  const [changelog, setChangelog] = useState("")
  const [errorMsg, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const upload = useSkillUpload({
    onSuccess: (r) => onSuccess(r.skillId),
    onError: (err) => {
      console.error(err)
      setError(err.message)
    },
  })

  async function onPickFile(picked: File | null) {
    if (!picked) {
      setFile(null)
      setFormat(null)
      setPreviewMd("")
      return
    }
    const detected = detectFormat(picked.name)
    if (!detected) {
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
      // ★ zip 模式读 <slug>/SKILL.md frontmatter
      try {
        const buf = await picked.arrayBuffer()
        const zip = await JSZip.loadAsync(buf)
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
        // 静默吞
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
      await upload.mutateAsync({
        file,
        format,
        name,
        description,
        // upload 模式不需要 changelog — 走 undefined
        changelog: undefined,
        category: category || undefined,
      })
    } catch {
      // 错误已通过 onError 上抛
    }
  }

  const progressLabel = ["", "本地打包…", "上传七牛云…", "确认…"][upload.progress] ?? ""
  const inFlight = upload.progress > 0
  const submitDisabled = !file || !format || !name || !description || inFlight

  return (
    <>
      <FormFields
        file={file}
        format={format}
        previewMd={previewMd}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        category={category}
        setCategory={setCategory}
        changelog={changelog}
        setChangelog={setChangelog}
        isUpdate={false}
        inFlight={inFlight}
        onPickFile={onPickFile}
        dragOver={dragOver}
        setDragOver={setDragOver}
        onDrop={onDrop}
        fileInputRef={fileInputRef}
      />

      {upload.error && (
        <Alert variant="destructive">
          <AlertDescription>{upload.error.message}</AlertDescription>
        </Alert>
      )}
      {errorMsg && !upload.error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}
      {inFlight && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progressLabel}
        </div>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={inFlight} className="cursor-pointer">
            取消
          </Button>
        </DialogClose>
        <Button onClick={onSubmit} disabled={submitDisabled} className="cursor-pointer">
          {inFlight && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          上传
        </Button>
      </DialogFooter>
    </>
  )
}

// =============================================================
// UpdateDialogBody — mode="update"
// =============================================================
function UpdateDialogBody({
  skill,
  onSuccess,
}: {
  skill: Skill
  onSuccess: (skillId: string) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<UploadSourceFormat | null>(null)
  const [previewMd, setPreviewMd] = useState<string>("")
  // ★ prefill from skill — useState 初值在 mount 时已经填好
  const [name, setName] = useState(skill.name)
  const [description, setDescription] = useState(skill.description)
  const [category, setCategory] = useState<string>(skill.category ?? "")
  const [changelog, setChangelog] = useState("")
  const [errorMsg, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = useSkillUpdate(skill, {
    onSuccess: (r) => onSuccess(r.skillId),
    onError: (err) => {
      console.error(err)
      setError(err.message)
    },
  })

  // ★ skill.id 变化时(外部切换 skill)重新同步 name/description/category。
  // changelog 永远清空(用户必须手填)。
  useEffect(() => {
    setName(skill.name)
    setDescription(skill.description)
    setCategory(skill.category ?? "")
    setChangelog("")
    setError(null)
    setFile(null)
    setFormat(null)
    setPreviewMd("")
    update.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill.id])

  async function onPickFile(picked: File | null) {
    if (!picked) {
      setFile(null)
      setFormat(null)
      setPreviewMd("")
      return
    }
    const detected = detectFormat(picked.name)
    if (!detected) {
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
      // update 模式 name/description 已被 skill 填过,不覆盖
    } else {
      setPreviewMd("")
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) onPickFile(dropped)
  }

  function validateChangelog(): boolean {
    if (changelog.trim().length === 0) {
      setError("更新说明不能为空")
      return false
    }
    return true
  }

  async function onSubmit() {
    if (!file || !format) return
    if (!validateChangelog()) return
    try {
      await update.mutateAsync({
        file,
        format,
        name,
        description,
        // trim 后非空才发送,空 → undefined(避免后端长度校验失败)
        changelog: changelog.trim() ? changelog : undefined,
        category: category || undefined,
      })
    } catch {
      // 错误已通过 onError 上抛
    }
  }

  const progressLabel = ["", "本地打包…", "上传七牛云…", "确认…"][update.progress] ?? ""
  const inFlight = update.progress > 0
  const submitDisabled =
    !file ||
    !format ||
    !name ||
    !description ||
    changelog.trim().length === 0 ||
    inFlight

  return (
    <>
      <FormFields
        file={file}
        format={format}
        previewMd={previewMd}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        category={category}
        setCategory={setCategory}
        changelog={changelog}
        setChangelog={setChangelog}
        isUpdate={true}
        inFlight={inFlight}
        onPickFile={onPickFile}
        dragOver={dragOver}
        setDragOver={setDragOver}
        onDrop={onDrop}
        fileInputRef={fileInputRef}
      />

      {update.error && (
        <Alert variant="destructive">
          <AlertDescription>{update.error.message}</AlertDescription>
        </Alert>
      )}
      {errorMsg && !update.error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}
      {inFlight && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progressLabel}
        </div>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={inFlight} className="cursor-pointer">
            取消
          </Button>
        </DialogClose>
        <Button onClick={onSubmit} disabled={submitDisabled} className="cursor-pointer">
          {inFlight && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          更新
        </Button>
      </DialogFooter>
    </>
  )
}