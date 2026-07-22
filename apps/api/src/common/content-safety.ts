export const AUTOMATIC_FINANCIAL_REVIEW_REASON = "财经高风险词人工审核";

export const FINANCIAL_HIGH_RISK_TERMS = [
  "荐股", "带单", "代客理财", "代理财", "保本", "保证收益", "稳赚", "内幕消息", "内幕交易",
  "资金募集", "非法募资", "开户返佣", "高收益无风险", "证券账户代操作", "代操作账户",
] as const;

const unsafeControlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function normalizePlainText(value: string) {
  return value.normalize("NFKC").replace(unsafeControlCharacters, "").trim();
}

export function findFinancialHighRiskTerms(value: string) {
  const normalized = normalizePlainText(value).toLocaleLowerCase("zh-CN");
  return FINANCIAL_HIGH_RISK_TERMS.filter((term) => normalized.includes(term.toLocaleLowerCase("zh-CN")));
}
