import { renderCoverSvg } from "./covers.renderer";

describe("renderCoverSvg", () => {
  it("生成包含标题和类型的 SVG", () => {
    const svg = renderCoverSvg({ title: "测试文章标题", type: "policy", category: "税务" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("xmlns=\"http://www.w3.org/2000/svg\"");
    expect(svg).toContain("政策");
    expect(svg).toContain("测试文章标题");
    expect(svg).toContain("税务");
  });

  it("标题中的 XML 特殊字符被转义", () => {
    const svg = renderCoverSvg({ title: 'A & B <C> "D"', type: "news" });
    expect(svg).toContain("A &amp; B &lt;C&gt; &quot;D&quot;");
    expect(svg).not.toContain("<C>");
  });

  it("长标题会被换行", () => {
    const longTitle = "这是一条特别特别特别特别特别特别特别特别特别特别特别特别特别长的政策新闻标题用来验证换行逻辑";
    const svg = renderCoverSvg({ title: longTitle, type: "policy" });
    // 标题文本被拆成多行 tspan
    const tspanCount = (svg.match(/<tspan/g) ?? []).length;
    expect(tspanCount).toBeGreaterThan(1);
  });

  it("未知类型回退到默认配色", () => {
    const svg = renderCoverSvg({ title: "标题", type: "unknown" });
    expect(svg).toContain("资讯");
  });
});
