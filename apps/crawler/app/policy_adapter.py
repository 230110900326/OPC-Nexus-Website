from __future__ import annotations

from dataclasses import dataclass
from .parser import parse_article

@dataclass(frozen=True)
class PolicyDocument:
    title: str; issuing_authority: str | None; document_number: str | None; published_at: str | None; original_url: str

def parse_policy_sample(html: str, url: str) -> PolicyDocument:
    article = parse_article(html, url)
    values = {line.split("：", 1)[0]: line.split("：", 1)[1].strip() for line in article.body.split(" ") if "：" in line}
    return PolicyDocument(title=article.title, issuing_authority=values.get("发文机关"), document_number=values.get("文号"), published_at=values.get("发布日期") or article.published_at, original_url=article.canonical_url)
