/**
 * 解析后端 RAG markdown 为结构化卡片数组。
 *
 * markdown 格式（来自 AxiomVibeTrading 后端 RAG prefetch）：
 * - 卡片之间用 `\n---\n` 分隔
 * - 每张卡片首行：`- **知识星球 · 摘要** (相似度 0.82)`
 * - 第二行 title（兼容两种格式）:
 *   - 生产环境（无书名号）: `_中芯国际2Q26业绩快评_ (2026-08-13) · 提及: 中芯国际 · ticker=688981.SH`
 *   - 老格式: `_《中芯国际Q2Q6业绩快评》_ (2026-08-13)`
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

    // Title: try legacy _《title》_ (date) first, fall back to production _title_ (date)
    // (production often has tail content after the date like `· 提及: ... · ticker=...`).
    const titleMatchBracketed = trimmed.match(/_《\s*([^》]+?)\s*》_\s*\((\d{4}-\d{2}-\d{2})\)/);
    const titleMatchBare = titleMatchBracketed ?? trimmed.match(/_\s*(.+?)\s*_\s*\((\d{4}-\d{2}-\d{2})\)/);
    const title = titleMatchBare ? titleMatchBare[1].trim() : "";
    const date = titleMatchBare ? titleMatchBare[2] : "";

    // Body: take everything after the title line.
    // Production format may have tail content (e.g. `· 提及: ... · ticker=...`)
    // on the same line as the title, so we advance to the next newline.
    let body = "";
    if (titleMatchBare) {
      const afterTitle = (titleMatchBare.index ?? 0) + titleMatchBare[0].length;
      const newlineIdx = trimmed.indexOf("\n", afterTitle);
      const restStart = newlineIdx === -1 ? trimmed.length : newlineIdx + 1;
      const rest = trimmed.slice(restStart).replace(/^[\s\n]+/, "");
      body = rest.trim();
    }

    const [source, view] = sourceView.split("·").map((s) => s.trim());
    out.push({ source, view, title, date, similarity, body });
  }
  return out;
}