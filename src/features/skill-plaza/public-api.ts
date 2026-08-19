/**
 * Public API surface for the `skill-plaza` feature.
 *
 * This is the OFFICIAL cross-feature import boundary. Other features
 * (e.g. `vibe-trading`) MUST import hooks and types from this file
 * instead of reaching into private paths like
 * `@/features/skill-plaza/hooks/...` or `@/features/skill-plaza/services/...`.
 *
 * Anything not re-exported here is considered internal implementation detail
 * and may change without notice.
 *
 * Mirrors the public surface that the spec §3.5.2 session-mount delta
 * mechanism depends on: enable/disable favorites (user baseline) +
 * add/remove session mounts (per-session delta).
 */
export {
  useSessionMounts,
  useSetSessionMount,
} from "@/features/skill-plaza/hooks/use-session-skills"
export { useUserSkillBindings } from "@/features/skill-plaza/hooks/use-user-skill-bindings"

export type { Skill, MountOp } from "@/types/skill"
