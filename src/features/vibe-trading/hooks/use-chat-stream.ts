import { useCallback, useEffect } from "react"
import {
  cancelSession,
  getMessages,
  patchSession,
  submitMessage,
} from "../services/vibe-api"
import {
  type ChatMessage,
  type PerSession,
  stampAttemptIdOnMessages,
  useSessionStore,
} from "../stores/session-store"
import { subscribeSession } from "../services/events-stream"

type Slice = Pick<PerSession, "messages" | "streaming" | "error" | "historyLoaded">

export type { ChatMessage }

export function useChatStream(
  sessionId: string | null,
  title?: string | null,
) {
  // 响应式订阅 store 切片（避免重渲染整个 store）
  const slice = useSessionStore((s): Slice | undefined =>
    sessionId ? s.byId[sessionId] : undefined,
  )
  const ensure = useSessionStore((s) => s.ensure)
  const setHistoryLoaded = useSessionStore((s) => s.setHistoryLoaded)

  // 进入会话：确保 store 槽存在 + 拉历史 + 开 /events 订阅
  useEffect(() => {
    if (!sessionId) return
    ensure(sessionId)
    const cur = useSessionStore.getState().byId[sessionId]
    if (cur && !cur.historyLoaded) {
      void getMessages(sessionId)
        .then((msgs) => {
          const history = msgs.map(toChatMessage)
          // 拉历史期间可能已乐观插入了消息（pendingMessage 自动发送场景）;
          // setHistoryLoaded 会整体替换 messages,这里把乐观消息接在历史之后,避免被冲掉。
          // 此刻 historyLoaded 仍为 false 且槽位初始为空,所以现存消息必为乐观插入,无需去重。
          const optimistic = useSessionStore.getState().byId[sessionId]?.messages ?? []
          setHistoryLoaded(
            sessionId,
            optimistic.length > 0 ? [...history, ...optimistic] : history,
          )
        })
        .catch((e) =>
          useSessionStore.setState((s) => {
            const c = s.byId[sessionId]
            if (!c) return s
            return {
              byId: {
                ...s.byId,
                [sessionId]: {
                  ...c,
                  // 同时置 historyLoaded,否则 loadingHistory 永远为 true:
                  // effect 依赖不变不会重跑,UI 会卡在"加载历史消息…"且 Sender 一直 disabled。
                  // 置为 true 后至少能解锁输入框并展示错误提示。
                  historyLoaded: true,
                  error: e instanceof Error ? e.message : "Failed to load history",
                },
              },
            }
          }),
        )
    }
    subscribeSession(sessionId)
    // 不在 effect cleanup 中 unsubscribe —— 后台继续收 events
  }, [sessionId, ensure, setHistoryLoaded])

  const send = useCallback(
    async (
      content: string,
      attachment?: { filename: string; file_path: string } | null,
      swarmPreset?: { name: string; title: string } | null,
      attachedSkillIds: string[] = [],
    ) => {
      if (!sessionId) return
      const cur = useSessionStore.getState().byId[sessionId]
      if (!cur || cur.streaming) return   // per-session 串行保护

      // swarm + attachment 前缀注入：把 swarm 模式 / 上传文件信息写在 user prompt 前面，
      // 这样 SSE stream 下来的下游 agent / LLM 能看到这些上下文。
      // 注意：user 在 chat UI 自己的气泡里看到的是原始 trimmed 输入（userMsg.content），
      // finalContent 只用于 POST /messages。
      // 顺序：swarm prefix 先（更外层），attachment prefix 后（更靠近原始内容）。
      let finalContent = content
      if (swarmPreset) {
        finalContent = `[Swarm Team Mode] Use the swarm tool to assemble the best specialist team for this task. Auto-select the most appropriate preset.\n\n${finalContent}`
      }
      if (attachment) {
        finalContent = `[Uploaded file: ${attachment.filename}, path: ${attachment.file_path}]\n\n${finalContent}`
      }

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content,
        // 把 attachment 持久化到 userMsg,这样 user 气泡渲染时能拿到附件信息
        // 并展示成 FileCard(见 chat-dialog.tsx 的 bubbleItems pipeline)。
        // 注意:后端只看到 `content` 里的 prefix 字符串;`attachment` 字段
        // 是纯客户端 UI 元数据,不参与 wire。
        attachment: attachment
          ? { filename: attachment.filename, file_path: attachment.file_path }
          : undefined,
        createdAt: new Date().toISOString(),
      }
      const placeholder: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      }

      // 乐观插入 + 锁 streaming
      useSessionStore.setState((s) => ({
        byId: {
          ...s.byId,
          [sessionId]: {
            ...cur,
            messages: [...cur.messages, userMsg, placeholder],
            streaming: true,
            error: null,
          },
        },
      }))

      // 自动标题判断（cur 是 send 入口快照,length===0 表示首条 user 消息）
      const isFirstUserMessage = cur.messages.length === 0
      const currentSessionTitle = typeof title === "string" ? title : null

      try {
        // Skill Plaza:仅当用户本次确实选了 skill 才把 skills 字段带过去。
        // 空数组 / undefined 走 submitMessage 的 default 省略路径,保持
        // bundled-only session 的向后兼容(老调用方签名兼容)。
        const skillsPayload =
          attachedSkillIds.length > 0
            ? attachedSkillIds.map((id) => ({ id }))
            : undefined
        const { attemptId } = await submitMessage(sessionId, finalContent, skillsPayload)

        // 把 attemptId 写回占位;同时回放 POST 期间积压在 pendingDeltas 里的早批 delta。
        // 同时清掉上一次 attempt 残留的 error 状态,防止 cancel 旧 attempt 的滞后 attempt.error 事件污染当前会话。
        //
        // Race 防御:POST /messages 还没返回 attemptId 时,/events 已经把首批 delta 推过来了,
        // appendDelta 的 no-match 分支会创建一条 stream-<aid> synthetic。stampAttemptIdOnMessages
        // 检测到 synthetic 存在时:丢弃 placeholder,并把 attemptId 写到 synthetic 上
        // (synthetic.content 已经包含 streamed delta,不需要再叠加 buffered)。
        useSessionStore.setState((s) => {
          const c = s.byId[sessionId]
          if (!c) return s
          const buffered = c.pendingDeltas?.[attemptId]
          const restDeltas = c.pendingDeltas
            ? Object.fromEntries(
                Object.entries(c.pendingDeltas).filter(([k]) => k !== attemptId),
              )
            : undefined
          const messages = stampAttemptIdOnMessages(
            c.messages,
            placeholder.id,
            attemptId,
            buffered ?? "",
          )
          return {
            byId: {
              ...s.byId,
              [sessionId]: {
                ...c,
                messages,
                activeAttemptId: attemptId,
                error: null,
                pendingDeltas:
                  restDeltas && Object.keys(restDeltas).length > 0
                    ? restDeltas
                    : undefined,
              },
            },
          }
        })

        // 自动标题 PATCH（fire-and-forget，失败不影响 UI）
        if (isFirstUserMessage && !currentSessionTitle) {
          const t = content.slice(0, 30).trim()
          if (t) {
            void patchSession(sessionId, { title: t }).catch(() => undefined)
          }
        }
        // attempt 完成由 events 流触发 markAttemptComplete
      } catch (e) {
        useSessionStore.setState((s) => {
          const c = s.byId[sessionId]
          if (!c) return s
          return {
            byId: {
              ...s.byId,
              [sessionId]: {
                ...c,
                messages: c.messages.filter((m) => m.id !== placeholder.id),
                streaming: false,
                error: e instanceof Error ? e.message : "Submit failed",
              },
            },
          }
        })
      }
    },
    [sessionId, title],
  )

  const cancel = useCallback(async () => {
    if (!sessionId) return
    const cur = useSessionStore.getState().byId[sessionId]
    if (!cur?.streaming) return
    // 立即本地标记 —— UI 立刻反映。
    // 同时把"当前正在流的那条 assistant 消息"标记为 cancelledAt: 上游会在
    // cancel 之后推一帧 text_delta "Execution failed: cancelled by user",
    // 这些内容会继续 append 到消息 content 上 —— 没有 cancelledAt 标记的话,
    // 用户看到的就是"AI 回复了一句错误信息",分不清是取消还是真出错。
    useSessionStore.setState((s) => {
      const c = s.byId[sessionId]
      if (!c) return s
      const now = new Date().toISOString()
      // 找"当前正在流的 assistant 消息":优先按 activeAttemptId 匹配,
      // 退一步用反向扫描找最后一条尚未 cancelled 的 assistant(应对 race /
      // send() 还没把 attemptId 写回 placeholder 的窗口期)。
      let lastStreamingAsstIdx = -1
      const aid = c.activeAttemptId
      if (aid) {
        lastStreamingAsstIdx = c.messages.findIndex((m) => m.attemptId === aid)
      }
      if (lastStreamingAsstIdx === -1) {
        for (let i = c.messages.length - 1; i >= 0; i--) {
          const m = c.messages[i]
          if (m.role === "assistant" && !m.cancelledAt) {
            lastStreamingAsstIdx = i
            break
          }
        }
      }
      const messages =
        lastStreamingAsstIdx === -1
          ? c.messages
          : c.messages.map((m, i) =>
              i === lastStreamingAsstIdx ? { ...m, cancelledAt: now } : m,
            )
      return {
        byId: {
          ...s.byId,
          [sessionId]: {
            ...c,
            messages,
            streaming: false,
            activeAttemptId: null,
          },
        },
      }
    })
    // fire-and-forget 调后端 cancel
    void cancelSession(sessionId).catch(() => undefined)
  }, [sessionId])

  return {
    messages: slice?.messages ?? [],
    streaming: slice?.streaming ?? false,
    error: slice?.error ?? null,
    send,
    cancel,
  }
}

function toChatMessage(m: { id: string; role: string; content: string; createdAt: string | Date }): ChatMessage {
  return {
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
    createdAt: typeof m.createdAt === "string" ? m.createdAt : m.createdAt.toISOString(),
  }
}
