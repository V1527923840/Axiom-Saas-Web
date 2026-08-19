"use client";

import { Sender } from "@ant-design/x";
import type { SenderRef } from "@ant-design/x/es/sender/interface";
import { useEffect, useRef } from "react";
import { MoreMenu } from "./more-menu";

export interface ChatSenderProps {
  input: string;
  setInput: (v: string) => void;
  uploading: boolean;
  isRunning: boolean;
  onSend: () => void;
  onCancel: () => void;
  onCreateGoal: () => void;
  onStartSwarm: () => void;
  // 文件选定后回调 (React.ChangeEvent)。ChatDialog 在这里处理 50MB / 黑名单 /
  // 上传副作用 (setUploading + setAttachment)。
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  goalComposerActive: boolean;
}

/**
 * ChatDialog 底部的输入区:MoreMenu + 文件 input + (hidden) SkillAttachMenu
 * + Sender。所有需要 near-DOM 的 refs (fileInputRef / inputRef) 都住在这里,
 * 因为它们引用的是这个子树里的节点。
 *
 * SkillAttachMenu 渲染块被刻意保留为注释,后人改回来时能立刻定位入口。
 * selectedSkillIds / attachment / swarmPreset 状态机全部留在 ChatDialog,
 * 本组件只关心"输入什么、按了什么按钮"。
 */
export function ChatSender({
  input,
  setInput,
  uploading,
  isRunning,
  onSend,
  onCancel,
  onCreateGoal,
  onStartSwarm,
  onFileChange,
  goalComposerActive,
}: ChatSenderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<SenderRef>(null);

  // 替代原本 Sender 上的 `autoFocus` —— antd-x 的 SenderProps 只 pick 了
  // placeholder/onKeyUp/onFocus/onBlur,故意排除了 autoFocus;挂载时通过
  // SenderRef.focus() 主动聚焦,行为等价。
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex gap-2 items-end">
      <MoreMenu
        disabled={isRunning || uploading}
        onPickFile={() => fileInputRef.current?.click()}
        onCreateGoal={() => {
          onCreateGoal();
          // 沿用旧行为:进入目标模式后立刻把焦点送回 Sender 输入框。
          inputRef.current?.focus();
        }}
        onStartSwarm={() => {
          onStartSwarm();
          // 沿用旧行为:进入蜂群模式后立刻把焦点送回 Sender 输入框。
          inputRef.current?.focus();
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.xls,.pptx,.csv,.tsv,.txt,.md,.log,.json,.yaml,.yml,.toml,.html,.xml,.rst,.png,.jpg,.jpeg,.gif,.bmp,.webp,.tiff"
        className="hidden"
        onChange={onFileChange}
      />
      {/* ★ 2026-08-19: 输入框旁的"会话 Skill 挂载"📌 按钮隐藏 — 按需求只展示"我的 Agent"页,
          对话区不再暴露会话级挂载入口。SkillAttachMenu 组件保留以便后续复用。
          selectedSkillIds 状态机仍保留,后端透传 `skills:[{id}]` 能力不变。 */}
      <Sender
        ref={inputRef}
        value={input}
        onChange={setInput}
        onSubmit={onSend}
        onCancel={onCancel}
        // 参见 ChatDialog isRunning 的注释:goal-attempt 期间整体保持红方块 cancel,
        // 不因为某个 sub-attempt 完成就切回 send。
        loading={isRunning}
        submitType="enter"
        placeholder={
          goalComposerActive
            ? "输入研究目标,Enter 创建…"
            : "输入消息,Enter 发送,Shift+Enter 换行…"
        }
        className="w-full"
      />
    </div>
  );
}
