"use client";

import type { GoalSnapshot, UploadResult } from "../lib/vibe-types";
import type { OpenToolCall } from "../lib/parse-message";
import { AttachmentChip } from "./attachment-chip";
import { GoalChip } from "./goal-chip";
import { GoalComposerChip } from "./goal-composer-chip";
import { GoalPanel } from "./goal-panel";
import { SwarmChip } from "./swarm-chip";
import { ToolCallIndicator } from "./tool-call-indicator";

export interface ChatChipGroupProps {
  goalSnapshot: GoalSnapshot | null;
  goalDetailsOpen: boolean;
  onGoalChipClick: () => void;
  goalComposerActive: boolean;
  onClearGoalComposer: () => void;
  attachment: Pick<UploadResult, "filename" | "file_path"> | null;
  onClearAttachment: () => void;
  swarmPreset: { name: string; title: string } | null;
  onClearSwarm: () => void;
  uploading: boolean;
  onContinueGoal: () => void;
  onSaveEdit: (objective: string) => void;
  onCancelGoal: () => void;
  onCancelTask: () => void;
  isRunning: boolean;
  continueDisabled: boolean;
  openToolCalls: OpenToolCall[];
}

/**
 * ChatDialog 输入框上方的"激活状态指示器"区域:
 *   - GoalChip + GoalPanel (展开时)
 *   - GoalComposerChip (目标模式中)
 *   - AttachmentChip (有附件)
 *   - SwarmChip (蜂群模式)
 *   - uploading 提示
 *   - 当前 assistant 消息未闭合的 tool_call 列表
 *
 * 状态本身 (goalSnapshot / attachment / swarmPreset / goalDetailsOpen / ...)
 * 由 ChatDialog 持有,本组件只做"看见什么就画什么"。
 */
export function ChatChipGroup({
  goalSnapshot,
  goalDetailsOpen,
  onGoalChipClick,
  goalComposerActive,
  onClearGoalComposer,
  attachment,
  onClearAttachment,
  swarmPreset,
  onClearSwarm,
  uploading,
  onContinueGoal,
  onSaveEdit,
  onCancelGoal,
  onCancelTask,
  isRunning,
  continueDisabled,
  openToolCalls,
}: ChatChipGroupProps) {
  return (
    <>
      {goalSnapshot && (
        <div className="grid gap-2">
          <GoalChip
            snapshot={goalSnapshot}
            open={goalDetailsOpen}
            onClick={onGoalChipClick}
          />
          {goalDetailsOpen && (
            <GoalPanel
              snapshot={goalSnapshot}
              onContinue={onContinueGoal}
              onSaveEdit={(objective) => {
                void onSaveEdit(objective);
              }}
              onCancel={() => {
                void onCancelGoal();
              }}
              onCancelTask={onCancelTask}
              running={isRunning}
              continueDisabled={continueDisabled}
            />
          )}
        </div>
      )}
      {goalComposerActive && <GoalComposerChip onClear={onClearGoalComposer} />}
      {attachment && (
        <AttachmentChip attachment={attachment} onClear={onClearAttachment} />
      )}
      {swarmPreset && (
        <SwarmChip title={swarmPreset.title} onClear={onClearSwarm} />
      )}
      {uploading && (
        <div className="text-xs text-muted-foreground">上传中…</div>
      )}
      {openToolCalls.length > 0 && (
        <div className="flex flex-col gap-1 border-t px-3 py-2">
          {openToolCalls.map((c) => (
            <ToolCallIndicator key={c.index} call={c} />
          ))}
        </div>
      )}
    </>
  );
}
