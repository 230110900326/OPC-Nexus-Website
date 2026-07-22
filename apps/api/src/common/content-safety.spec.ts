import { findFinancialHighRiskTerms, normalizePlainText } from "./content-safety";

describe("content safety", () => {
  it("normalizes compatibility characters and strips unsafe controls", () => {
    expect(normalizePlainText("  ＯＰＣ\u0000 研究  ")).toBe("OPC 研究");
  });

  it("routes high-risk financial promises to human review", () => {
    expect(findFinancialHighRiskTerms("老师带单，承诺保证收益")).toEqual(expect.arrayContaining(["带单", "保证收益"]));
  });

  it("does not flag ordinary market discussion", () => {
    expect(findFinancialHighRiskTerms("讨论利率变化对企业现金流的影响")).toEqual([]);
  });
});
