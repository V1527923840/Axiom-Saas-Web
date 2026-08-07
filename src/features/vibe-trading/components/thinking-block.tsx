export function ThinkingBlock({ content, closed }: { content: string; closed: boolean }) {
  const trimmed = content.trim()
  if (!trimmed) return null
  // closed prop is preserved for the Segment typing but no longer drives UI —
  // thinking is always visible while content is present.
  void closed
  return (
    <div className="text-muted-foreground my-2 border-l-2 border-muted-foreground/30 pl-2 text-sm italic">
      {trimmed}
    </div>
  )
}
