/** 文章标题精简：去掉来源后缀（| 来源 / - 来源 / _来源 等），超长标题在标点处截断。 */

const SOURCE_SUFFIX = [
  /\s*[|｜]\s*[^|｜\s]+$/, // " ... | 每经网"
  /\s*[_—–-]\s*[^_—–-\s]+$/, // " ..._推荐_i黑马" / " ... - 来源"
];

/** 是否为聚合/晚报/周报类内容（把多条新闻塞进一篇）。这类内容不应作为单篇文章入库。 */
const ROUNDUP_PATTERN = /(早报|晚报|晨报|午报|周报|月报|新闻早餐|早间新闻|每日要闻|热点汇总|快讯汇总|新闻盘点)/;

export function isRoundupTitle(title: string): boolean {
  if (!title) return false;
  if (ROUNDUP_PATTERN.test(title)) return true;
  const segments = title.split(/[；;]/).filter((segment) => segment.trim().length > 0);
  return segments.length >= 4;
}

export function cleanTitle(title: string, maxLen = 40): string {
  let text = (title ?? "").trim();
  for (const pattern of SOURCE_SUFFIX) {
    text = text.replace(pattern, "").trim();
  }
  if (text.length > maxLen) {
    const cut = text.slice(0, maxLen);
    const punct = Math.max(cut.lastIndexOf("；"), cut.lastIndexOf("，"), cut.lastIndexOf("。"), cut.lastIndexOf("？"), cut.lastIndexOf("、"));
    const end = punct > Math.floor(maxLen * 0.5) ? punct + 1 : maxLen;
    text = cut.slice(0, end).trimEnd() + "…";
  }
  return text;
}
