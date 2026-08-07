/**
 * 根据文章标题/类型/分类生成一张 SVG 封面图（纯函数，无副作用）。
 * 用于资讯没有 og:image 等真实封面时自动兜底，保证首页卡片与详情页都有封面。
 */

type Palette = { from: string; to: string; accent: string; label: string };

const PALETTES: Record<string, Palette> = {
  policy: { from: "#0f2a6b", to: "#1d4ed8", accent: "#93c5fd", label: "政策" },
  insight: { from: "#2e1065", to: "#6d28d9", accent: "#c4b5fd", label: "深度" },
  news: { from: "#0b3d2e", to: "#0f766e", accent: "#6ee7b7", label: "资讯" },
};

const DEFAULT_PALETTE: Palette = { from: "#111827", to: "#1e3a8a", accent: "#93c5fd", label: "资讯" };

const FONT = "'PingFang SC','Microsoft YaHei','Noto Sans CJK SC','Source Han Sans SC',sans-serif";

export function renderCoverSvg(input: { title: string; type?: string | null; category?: string | null }): string {
  const palette = PALETTES[input.type ?? ""] ?? DEFAULT_PALETTE;
  const lines = wrapTitle(input.title || "未命名内容");
  const tspans = lines.map((line, index) => `    <tspan x="80" dy="${index === 0 ? "0" : "70"}">${escapeXml(line)}</tspan>`).join("\n");
  const categorySuffix = input.category ? `&#160;&#183;&#160;${escapeXml(input.category)}` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.from}"/>
      <stop offset="1" stop-color="${palette.to}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <g opacity="0.18">
    <circle cx="1010" cy="120" r="260" fill="none" stroke="${palette.accent}" stroke-width="2"/>
    <circle cx="1080" cy="210" r="175" fill="none" stroke="${palette.accent}" stroke-width="1.5"/>
    <rect x="80" y="80" width="1040" height="515" fill="none" stroke="${palette.accent}" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="8 8"/>
  </g>
  <text x="80" y="185" font-family="${FONT}" font-size="26" letter-spacing="6" fill="${palette.accent}" font-weight="600">OPC&#160;NEXUS&#160;·&#160;${palette.label}${categorySuffix}</text>
  <text x="80" y="335" font-family="${FONT}" font-size="52" fill="#ffffff" font-weight="700">
${tspans}
  </text>
  <text x="80" y="642" font-family="${FONT}" font-size="22" fill="#ffffff" fill-opacity="0.7">OPC 财经情报 · 自动生成封面</text>
</svg>`;
}

function wrapTitle(title: string, fontSize = 52, maxWidth = 1040, maxLines = 3): string[] {
  const text = title.replace(/\s+/g, " ").trim();
  const full = text || "未命名内容";
  const charWidth = (char: string) => (char.charCodeAt(0) > 255 ? fontSize : fontSize * 0.55);
  const lines: string[] = [];
  let remaining = full;
  while (remaining && lines.length < maxLines) {
    let taken = 0;
    let index = 0;
    while (index < remaining.length && taken + charWidth(remaining[index]) <= maxWidth) {
      taken += charWidth(remaining[index]);
      index++;
    }
    if (index === 0) index = 1;
    lines.push(remaining.slice(0, index));
    remaining = remaining.slice(index);
  }
  if (remaining) lines[lines.length - 1] += "…";
  return lines;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
