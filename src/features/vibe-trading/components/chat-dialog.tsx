"use client"

import { Bubble, Prompts, Sender, Welcome } from "@ant-design/x"
import type { SenderRef } from "@ant-design/x/es/sender/interface"
import { Bot, Lightbulb, Sparkles, TrendingUp } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useGoal } from "../hooks/use-goal"
import { useSwarmStatus } from "../hooks/use-swarm-status"
import { useChatStream } from "../hooks/use-chat-stream"
import type { GoalSnapshot, GoalCriterion, SwarmRunStatus } from "../lib/vibe-types"
import { findOpenToolCalls } from "../lib/parse-message"
import { STALE_THRESHOLD_MS } from "../services/events-stream"
import { vibeApi } from "../services/vibe-api"
import { useSessionStore } from "../stores/session-store"
import { AttachmentChip } from "./attachment-chip"
import { GoalComposerChip } from "./goal-composer-chip"
import { AiMessageContent } from "./ai-message-content"
import { GoalChip } from "./goal-chip"
import { GoalPanel } from "./goal-panel"
import { MoreMenu } from "./more-menu"
import { SwarmChip } from "./swarm-chip"
import { SwarmStatusCard } from "./swarm-status-card"
import { ToolCallIndicator } from "./tool-call-indicator"

/**
 * 选中 "启动智能体蜂群" 时立刻注入的占位 SwarmRunStatus 的 sentinel runId。
 * 这个 runId 由 chat-dialog 自己写,跟后端真实的 runId 永远不会撞 —— 真 run
 * 到达 (SSE swarm.started) 时,events-stream 会先 removeSwarmStatus(sid, 这个)
 * 再 upsert 真实的 SwarmRunStatus,把 placeholder 替换掉。
 */
const PENDING_SWARM_RUN_ID = "__pending_swarm__"

const SUGGESTIONS = [
  { key: "market-brief", icon: <TrendingUp className="h-4 w-4" />, label: "今日市场概览", description: "拉一下美股 / A 股 / 港股的当日行情速览" },
  { key: "stock-deepdive", icon: <Sparkles className="h-4 w-4" />, label: "深度分析某只股票", description: "基本面 + 技术面 + 资金面,给一份研报式的拆解" },
  { key: "strategy", icon: <Lightbulb className="h-4 w-4" />, label: "聊聊交易策略", description: "讨论仓位管理、止盈止损、风格切换思路" },
  { key: "macro", icon: <Bot className="h-4 w-4" />, label: "宏观经济解读", description: "利率、通胀、就业数据对资产价格的影响" },
]

export function ChatDialog({
  sessionId,
  title,
  pendingMessage,
  onPendingMessageConsumed,
  onCreateAndSend,
  onCreateSessionOnly,
}: {
  sessionId: string | null
  title?: string | null
  pendingMessage?: string | null
  onPendingMessageConsumed?: () => void
  onCreateAndSend?: (content: string) => Promise<void> | void
  /**
   * 用于"无会话路径下"目标创建等场景:只创建会话,不发送任何消息。
   * 父组件需在 addSession 完成后将 currentId 切到新会话,本组件会用
   * pendingGoalObjective + 新 sessionId 触发目标创建与 kickoff。
   */
  onCreateSessionOnly?: () => Promise<void> | void
}) {
  const { messages, streaming, error, send, cancel } =
    useChatStream(sessionId, title)
  const debugSlice = useSessionStore((s) => (sessionId ? s.byId[sessionId] : undefined))
  const {
    snapshot: goalSnapshot,
    create: createGoalAction,
    edit: editGoal,
    cancel: cancelGoal,
  } = useGoal(sessionId)
  // Hydrate SwarmStatusCard from running/pending runs on session mount.
  // The hook is mounted for its side effect (it populates the store via
  // upsertSwarmStatus); the returned `statuses` are read by the existing
  // bubbleItems pipeline which already maps m.type === "swarm_status" to
  // <SwarmStatusCard/>. We don't need to read the result here.
  useSwarmStatus(sessionId)
  // Goal-attempt lifecycle 比 chat streaming 范围更大。一个 goal 可能由多个
  // sub-attempt 组成 (think → tool → respond),中间 attempt.completed 会让
  // streaming 暂时回到 false,但 goal.status === "active" 期间整个 AI 仍在
  // 工作中。Sender 上 loading 只看 streaming 会出现"运行中"和"取消任务"
  // 按钮闪烁/中途消失的问题;以 streaming || goal_active 作为统一的 "还有任务
  // 在跑" 信号,保证 cancel button 一直可见,直到整个 goal 结束。
  const goalIsActive = goalSnapshot?.goal.status === "active"
  const isRunning = streaming || goalIsActive
  const [input, setInput] = useState("")
  const [attachment, setAttachment] = useState<
    { filename: string; file_path: string } | null
  >(null)
  const [swarmPreset, setSwarmPreset] = useState<
    { name: string; title: string } | null
  >(null)
  const [uploading, setUploading] = useState(false)
  const [goalDetailsOpen, setGoalDetailsOpen] = useState(false)
  const [goalComposerActive, setGoalComposerActive] = useState(false)
  // 无会话路径下,用户已输入目标文本但还没创建会话 —— 等 sessionId 出现后由
  // 下方 useEffect 触发 createGoalAction + kickoff,避免老逻辑里"必须先发消息"
  // 的限制。
  const [pendingGoalObjective, setPendingGoalObjective] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<SenderRef>(null)

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 立刻清空 value,允许同名文件重复上传
    e.target.value = ""
    if (file.size > 50 * 1024 * 1024) {
      alert("文件过大(上限 50MB)")
      return
    }
    const ext = (file.name.toLowerCase().split(".").pop() ?? "")
    const blocked = [
      "exe", "msi", "bat", "cmd", "com", "scr", "app", "dmg", "so",
      "dll", "dylib", "py", "sh", "bash", "zsh", "fish", "ps1",
      "zip", "rar", "7z", "tar", "gz",
    ]
    if (blocked.includes(ext)) {
      alert("该文件类型不允许上传")
      return
    }
    setUploading(true)
    try {
      const result = await vibeApi.uploadFile(file)
      setAttachment({ filename: result.filename, file_path: result.file_path })
    } catch (err) {
      alert(`上传失败: ${err instanceof Error ? err.message : "未知错误"}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    // Goal composer:用户先点 MoreMenu > "新建研究目标",输入框聚焦;此时
    // 输入即被解释为 goal objective,不再当作普通 message。
    if (goalComposerActive) {
      void (async () => {
        try {
          if (!sessionId) {
            // 无会话:不要让用户手动再发一条"占位消息"。把 objective 暂存
            // 为 pendingGoalObjective,然后让父组件创建一个空会话;
            // sessionId 一到位,下面的 useEffect 会接着 POST /goal 并发 kickoff。
            if (!onCreateSessionOnly) {
              // 极端退化:父组件没有提供只建会话的入口,仍然报警。
              alert("无法创建研究目标:页面未提供会话创建入口。")
              setGoalComposerActive(false)
              return
            }
            setPendingGoalObjective(trimmed)
            setGoalComposerActive(false)
            setInput("")
            void onCreateSessionOnly()
            return
          }
          await createGoalAction(trimmed)
          setGoalComposerActive(false)
          setGoalDetailsOpen(true)
          // 紧接着发一条 kickoff prompt,让 SSE 流起研究任务。
          const kickoff = `Start working on this research goal now.\nGoal: ${trimmed}`
          setInput("")
          setAttachment(null)
          void send(kickoff)
        } catch (err) {
          alert(`创建目标失败: ${err instanceof Error ? err.message : "未知"}`)
        }
      })()
      return
    }
    if (sessionId) {
      // 有会话:正常提交。streaming 由 store 内部拒绝(per-session 串行保护)。
      if (streaming) return
      void send(trimmed, attachment, swarmPreset)
    } else if (onCreateAndSend) {
      // 无会话:让上层建一个新会话并把内容作为 pendingMessage 自动发出。
      // 新会话创建时 attachment 状态会被丢弃(因为 pendingMessage 触发新会话后
      // setAttachment(null) 紧随其后执行);如果未来需要在新会话里也带附件,
      // 由 onCreateAndSend 的实现来决策。
      void onCreateAndSend(trimmed)
    } else {
      return
    }
    setInput("")
    setAttachment(null)
    setSwarmPreset(null)
  }

  // 继续现有目标:汇总未完成的 required criteria,作为一条 message 发出。
  const handleContinueGoal = () => {
    if (!sessionId || !goalSnapshot || isRunning) return
    const openCriteria = goalSnapshot.criteria
      .filter((c) => !criterionCovered(goalSnapshot, c) && c.required)
      .map((c) => `- ${c.text}`)
      .join("\n")
    const prompt = [
      "Continue the active research goal.",
      "",
      `Goal: ${goalSnapshot.goal.objective}`,
      openCriteria
        ? `Open criteria:\n${openCriteria}`
        : "All criteria appear covered.",
    ].join("\n")
    void send(prompt)
  }

  // pendingMessage 自动发送（保留 v1 行为）
  const consumedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!pendingMessage || !sessionId) return
    if (consumedRef.current === pendingMessage) return
    consumedRef.current = pendingMessage
    void send(pendingMessage)
    onPendingMessageConsumed?.()
  }, [pendingMessage, sessionId, send, onPendingMessageConsumed])

  // 无会话路径下的目标创建接力:handleSend 把 objective 暂存在
  // pendingGoalObjective 并触发 onCreateSessionOnly;当父组件完成 addSession
  // 并把新 sessionId 注入本组件后,本 effect 接力 POST /goal,然后把 kickoff
  // 发出去。pendingGoalObjective 在 effect 内清空,避免重复触发。
  const goalInFlightRef = useRef<string | null>(null)
  useEffect(() => {
    if (!sessionId || !pendingGoalObjective) return
    if (goalInFlightRef.current === pendingGoalObjective) return
    goalInFlightRef.current = pendingGoalObjective
    const objective = pendingGoalObjective
    setPendingGoalObjective(null)
    void (async () => {
      try {
        await createGoalAction(objective)
        setGoalDetailsOpen(true)
        const kickoff = `Start working on this research goal now.\nGoal: ${objective}`
        await send(kickoff)
      } catch (err) {
        alert(`创建目标失败: ${err instanceof Error ? err.message : "未知"}`)
        goalInFlightRef.current = null
      }
    })()
  }, [sessionId, pendingGoalObjective, createGoalAction, send])

  // 蜂群模式占位卡片:用户在 MoreMenu 选中 "启动智能体蜂群" 时,真实的 swarm
  // run 还没有被 agent 启动 (依赖 send() 之后 agent 识别 swarm 前缀才会走
  // create_swarm_run),但用户已经能看到 SwarmChip 提示模式激活了 —— 视觉与
  // 卡片之间的间隙会让用户以为卡片丢了。这里在 swarmPreset 变化时直接往
  // store 里塞一个 sentinel-runId 的占位 SwarmRunStatus (status="pending"),
  // 由 bubbleItems 流水线走 SwarmStatusCard 渲染,后端 swarm.started SSE
  // 事件到达时由 events-stream.ts 先 removeSwarmStatus 占位再 upsert 真实
  // run,实现无缝替换。
  //
  // 不覆盖已有真实 run:如果用户刷新页面或切到别的会话再回来,hydration 已经
  // 把真实 run 灌进 store,这时再叠一张 placeholder 是噪音。
  useEffect(() => {
    if (!sessionId || !swarmPreset) return
    const slot = useSessionStore.getState().byId[sessionId]
    const hasRealSwarm = slot?.messages.some(
      (m) => m.type === "swarm_status" && m.swarmStatus?.runId !== PENDING_SWARM_RUN_ID,
    )
    if (hasRealSwarm) return
    const placeholder: SwarmRunStatus = {
      runId: PENDING_SWARM_RUN_ID,
      preset: swarmPreset.name,
      status: "pending",
      currentLayer: 0,
      totalLayers: 0,
      startedAt: Date.now(),
      agents: [],
    }
    useSessionStore.getState().upsertSwarmStatus(sessionId, placeholder)
    // cleanup:swarmPreset 清空 / 切换到别的 preset / 组件卸载时,把 placeholder
    // 收掉。如果用户已经发出消息并触发了真实的 swarm.started,events-stream
    // 已经先把 placeholder remove 掉了,这里再 remove 一次是 no-op。
    return () => {
      useSessionStore.getState().removeSwarmStatus(sessionId, PENDING_SWARM_RUN_ID)
    }
  }, [sessionId, swarmPreset])

  // 找出当前正在流的 assistant message 上未闭合的 <tool_call>
  const streamingAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && streaming && m.attemptId)
  const openToolCalls = streamingAssistant
    ? findOpenToolCalls(streamingAssistant.content)
    : []

  const bubbleItems = messages.map((m) => {
    // swarm_status 是 store 合成的消息(upsertSwarmStatus,按 runId 去重),没有
    // attemptId 也没有文本 content —— 整条气泡交给 SwarmStatusCard 画,content
    // 传空串只是为了满足 Bubble item 的类型。
    if (m.type === "swarm_status" && m.swarmStatus) {
      const status = m.swarmStatus
      return {
        key: m.id,
        role: "ai" as const,
        content: "",
        streaming: false,
        loading: false,
        contentRender: () => <SwarmStatusCard status={status} />,
      }
    }
    return {
      key: m.id,
      role: (m.role === "user" ? "user" : "ai") as "user" | "ai",
      content: m.content,
      // 流式增量由 appendDelta 触发 React 重渲染,这里关掉 Bubble 自带的 typing 动画避免双重打字机。
      // streaming=true 让 Bubble.List 跳过 typing 渲染走纯 React 树。
      streaming: m.role === "assistant" && Boolean(m.attemptId) && streaming,
      loading: false,
      // AI 走自定义渲染(解析 thinking/tool/markdown + cancelled 角标);用户消息保持纯文本。
      // closure 捕获 m.cancelledAt —— use-chat-stream.cancel() 在 cancel 时往当前正在流的 assistant 消息上写 cancelledAt。
      contentRender:
        m.role === "assistant"
          ? (content: string) => (
              <AiMessageContent content={content} cancelledAt={m.cancelledAt} />
            )
          : undefined,
    }
  })

  // 只要有消息就显示对话,空消息一律走欢迎态。
  // 不再用 loadingHistory 阻塞 — 历史是异步加载的,拉回来前就显示空列表/欢迎态,
  // 期间用户也可以照常输入;流式事件直接 append 到 Bubble.List,实时刷新。
  const showWelcome = messages.length === 0

  return (
    <div className="flex h-full min-h-0 flex-1 min-w-0 flex-col">
      {import.meta.env.DEV && sessionId && debugSlice && (
        <details className="bg-muted/30 border-b px-3 py-1 font-mono text-[10px]">
          <summary className="cursor-pointer">vibe-debug · {sessionId.slice(0, 8)}…</summary>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
            <div>eventsSubscribed</div>
            <div>{String(debugSlice.eventsSubscribed)}</div>
            <div>streaming</div>
            <div>{String(debugSlice.streaming)}</div>
            <div>activeAttemptId</div>
            <div>{debugSlice.activeAttemptId ?? "—"}</div>
            <div>historyLoaded</div>
            <div>{String(debugSlice.historyLoaded)}</div>
            <div>lastEventAt</div>
            <div>
              {debugSlice.lastEventAt
                ? `${Math.round((Date.now() - debugSlice.lastEventAt) / 1000)}s ago`
                : "never"}
              {debugSlice.lastEventAt > 0 &&
                Date.now() - debugSlice.lastEventAt > STALE_THRESHOLD_MS && (
                  <span className="text-destructive ml-1">STALE</span>
                )}
            </div>
            <div>pendingDeltas</div>
            <div>
              {debugSlice.pendingDeltas
                ? Object.entries(debugSlice.pendingDeltas)
                    .map(([k, v]) => `${k.slice(0, 6)}:${v.length}`)
                    .join(" ")
                : "—"}
            </div>
            <div>pendingSnapshot</div>
            <div>
              {debugSlice.pendingSnapshot
                ? Object.keys(debugSlice.pendingSnapshot)
                    .map((k) => k.slice(0, 6))
                    .join(" ")
                : "—"}
            </div>
          </div>
        </details>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        {showWelcome ? (
          <WelcomeState />
        ) : (
          <Bubble.List
            items={bubbleItems}
            autoScroll
            className="h-full px-4 py-4"
            role={{
              user: { placement: "end", variant: "filled", shape: "default" },
              ai: { placement: "start", variant: "filled", shape: "default" },
            }}
          />
        )}
      </div>

      {error && (
        <div className="text-destructive px-3 py-1 text-sm">错误: {error}</div>
      )}

      {openToolCalls.length > 0 && (
        <div className="flex flex-col gap-1 border-t px-3 py-2">
          {openToolCalls.map((c) => (
            <ToolCallIndicator key={c.index} call={c} />
          ))}
        </div>
      )}

      <div className="w-full shrink-0 border-t p-3 space-y-2">
        {goalSnapshot && (
          <div className="grid gap-2">
            <GoalChip
              snapshot={goalSnapshot}
              open={goalDetailsOpen}
              onClick={() => setGoalDetailsOpen((o) => !o)}
            />
            {goalDetailsOpen && (
              <GoalPanel
                snapshot={goalSnapshot}
                onContinue={handleContinueGoal}
                onSaveEdit={(objective) => {
                  void editGoal(objective)
                }}
                onCancel={() => {
                  void cancelGoal()
                }}
                onCancelTask={cancel}
                running={isRunning}
                continueDisabled={isRunning}
              />
            )}
          </div>
        )}
        {goalComposerActive && (
          <GoalComposerChip onClear={() => setGoalComposerActive(false)} />
        )}
        {attachment && (
          <AttachmentChip
            attachment={attachment}
            onClear={() => setAttachment(null)}
          />
        )}
        {swarmPreset && (
          <SwarmChip
            title={swarmPreset.title}
            onClear={() => setSwarmPreset(null)}
          />
        )}
        {uploading && (
          <div className="text-xs text-muted-foreground">上传中…</div>
        )}
        <div className="flex gap-2 items-end">
          <MoreMenu
            disabled={streaming || uploading}
            onPickFile={() => fileInputRef.current?.click()}
            onCreateGoal={() => {
              // 互斥:进入目标模式自动清掉蜂群 preset。
              setSwarmPreset(null)
              setGoalComposerActive(true)
              inputRef.current?.focus()
            }}
            onStartSwarm={() => {
              // 互斥:进入蜂群模式自动退出目标模式。
              setGoalComposerActive(false)
              setSwarmPreset({ name: "auto", title: "Agent Swarm" })
              inputRef.current?.focus()
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.xls,.pptx,.csv,.tsv,.txt,.md,.log,.json,.yaml,.yml,.toml,.html,.xml,.rst,.png,.jpg,.jpeg,.gif,.bmp,.webp,.tiff"
            onChange={handleFileChange}
            className="hidden"
          />
          <Sender
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            onCancel={cancel}
            // 参见上面 isRunning 的注释:goal-attempt 期间整体保持红方块 cancel,
            // 不因为某个 sub-attempt 完成就切回 send。
            loading={isRunning}
            submitType="enter"
            placeholder={
              goalComposerActive
                ? "输入研究目标,Enter 创建…"
                : sessionId
                  ? "输入消息,Enter 发送,Shift+Enter 换行…"
                  : "输入消息,自动创建会话…"
            }
            autoFocus
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}

function WelcomeState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-2xl">
        <Welcome
          icon={
            <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-full">
              <Bot className="h-6 w-6" />
            </div>
          }
          title="AI 智能体"
          description="用自然语言提问,获取金融市场研究与交易思路。"
          className="mb-8"
        />
        <Prompts
          title="试试这些问题"
          wrap
          items={SUGGESTIONS.map((s) => ({ key: s.key, icon: s.icon, label: s.label, description: s.description }))}
          onItemClick={(info: { data: { label?: unknown } }) => {
            window.dispatchEvent(
              new CustomEvent("vibe-trading:prompt-select", {
                detail: { text: String(info.data.label ?? "") },
              }),
            )
          }}
        />
      </div>
    </div>
  )
}

// 与 goal-chip/goal-panel 内部相同的"已覆盖"判定 —— 抽出来在 chat-dialog 的
// handleContinueGoal 里复用,避免在两个文件里各写一份。
function criterionCovered(s: GoalSnapshot, c: GoalCriterion): boolean {
  return (
    !["", "pending", "open", "unsatisfied"].includes(c.status.toLowerCase()) ||
    s.evidence.filter((e) => e.criterion_id === c.criterion_id).length > 0
  )
}