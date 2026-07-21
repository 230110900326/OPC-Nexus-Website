from __future__ import annotations

from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse


@dataclass(frozen=True)
class ParsedArticle:
    title: str
    body: str
    author: str | None
    published_at: str | None
    image_url: str | None
    canonical_url: str


class _ArticleParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(); self.meta: dict[str, str] = {}; self.title = ""; self._in_title = False; self._ignored = 0; self.text: list[str] = []
    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value or "" for key, value in attrs}
        if tag in {"script", "style", "nav", "footer"}: self._ignored += 1
        if tag == "title": self._in_title = True
        if tag == "meta":
            key = (values.get("property") or values.get("name") or "").lower(); content = values.get("content", "")
            if key and content: self.meta[key] = content
        if tag == "link" and values.get("rel", "").lower() == "canonical": self.meta["canonical"] = values.get("href", "")
    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "nav", "footer"} and self._ignored: self._ignored -= 1
        if tag == "title": self._in_title = False
    def handle_data(self, data: str) -> None:
        value = " ".join(data.split())
        if self._in_title: self.title += value
        if value and not self._ignored: self.text.append(value)


def parse_article(html: str, url: str) -> ParsedArticle:
    parser = _ArticleParser(); parser.feed(html)
    title = parser.meta.get("og:title") or parser.title.strip()
    body = " ".join(parser.text)
    canonical = urljoin(url, parser.meta.get("canonical", url))
    return ParsedArticle(title=title, body=body, author=parser.meta.get("author"), published_at=parser.meta.get("article:published_time") or parser.meta.get("publishdate"), image_url=urljoin(url, parser.meta["og:image"]) if parser.meta.get("og:image") else None, canonical_url=canonical)


def is_allowed_url(url: str, allowed_domains: set[str]) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    hostname = parsed.hostname
    if not hostname:
        return False
    values = {domain.lower().lstrip(".") for domain in allowed_domains}
    host = hostname.lower()
    return any(host == domain or host.endswith(f".{domain}") for domain in values)
