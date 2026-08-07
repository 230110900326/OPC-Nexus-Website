/** 文章标题精简：去掉来源后缀（| 来源 / - 来源 / _来源 等），超长标题在标点处截断。 */

const SOURCE_SUFFIX = [
  /\s*[|｜]\s*[^|｜\s]+$/, // " ... | 每经网"
  /\s*[_—–-]\s*[^_—–-\s]+$/, // " ..._推荐_i黑马" / " ... - 来源"
];

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
