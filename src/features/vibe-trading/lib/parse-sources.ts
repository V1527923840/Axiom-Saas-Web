/**
 * 解析后端 RAG markdown 为结构化卡片数组。
 *
 * markdown 格式（来自 AxiomVibeTrading 后端 RAG prefetch）：
 * - 卡片之间用 `\n---\n` 分隔
 * - 每张卡片首行：`- **知识星球 · 摘要** (相似度 0.82)`
 * - 第二行：`_《标题》_ (2026-08-13)`
 * - 后续行为摘要正文
 *
 * 解析失败（格式漂移）时返回空数组；调用方应降级显示原 markdown 片段。
 */
export type ParsedSource = {
  source: string;
  view: string;
  title: string;
  date: string;
  similarity?: string;
  body: string;
};

export function parseSources(md: string): ParsedSource[] {
  const out: ParsedSource[] = [];
  const blocks = md.split(/\n---\n/);
  for (const blk of blocks) {
    const trimmed = blk.trim();
    if (!trimmed) continue;
    const headerMatch = trimmed.match(/-\s*\*\*(.+?)\*\*\s*(\(相似度\s*([0-9.]+)\))?/);
    if (!headerMatch) continue;
    const sourceView = headerMatch[1];
    const similarity = headerMatch[3];
    const titleMatch = trimmed.match(/_《\s*([^》]+?)\s*》_\s*\((\d{4}-\d{2}-\d{2})\)/);
    const title = titleMatch ? titleMatch[1].trim() : "";
    const date = titleMatch ? titleMatch[2] : "";
    let body = "";
    // 标题格式若变更(如 `_..._` 切换为 `**...**`),下面这行要同步修改
    const bodyMatch = trimmed.match(/_《\s*[^》]+?\s*》_\s*\(\d{4}-\d{2}-\d{2}\)\s*\n([\s\S]*)$/);
    if (bodyMatch) {
      body = bodyMatch[1].trim();
    }
    const [source, view] = sourceView.split("·").map((s) => s.trim());
    out.push({ source, view, title, date, similarity, body });
  }
  return out;
}
