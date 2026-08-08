// Shared criterion predicates. The "covered" rule is the same across
// goal-chip, goal-panel, and chat-dialog's continue-goal gate, so it lives
// here to avoid drift.

import type { GoalSnapshot, GoalCriterion } from "./vibe-types"

const UNCOVERED_STATUSES = new Set(["", "pending", "open", "unsatisfied"])

export function criterionCovered(s: GoalSnapshot, c: GoalCriterion): boolean {
  return (
    !UNCOVERED_STATUSES.has(c.status.toLowerCase()) ||
    s.evidence.some((e) => e.criterion_id === c.criterion_id)
  )
}