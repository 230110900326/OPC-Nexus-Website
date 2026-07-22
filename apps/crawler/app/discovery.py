from __future__ import annotations

from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urljoin
from xml.etree import ElementTree

from .parser import is_allowed_url


def discover_feed_urls(xml: str) -> list[str]:
    root = ElementTree.fromstring(xml); values: list[str] = []
    for node in root.findall(".//{*}link"):
        href = node.attrib.get("href") or (node.text or "").strip()
        if href.startswith("http"): values.append(href)
    for node in root.findall(".//{*}loc"):
        if node.text and node.text.strip().startswith("http"): values.append(node.text.strip())
    return list(dict.fromkeys(values))


def discovery_record(url: str, source_id: str) -> dict[str, str]:
    return {"url": url, "source_id": source_id, "discovered_at": datetime.now(timezone.utc).isoformat()}


class _LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        value = dict(attrs).get("href")
        if value:
            self.hrefs.append(value)


def discover_html_urls(html: str, base_url: str, allowed_domains: set[str]) -> list[str]:
    parser = _LinkParser()
    parser.feed(html)
    urls = [urljoin(base_url, href) for href in parser.hrefs]
    return list(dict.fromkeys(url for url in urls if is_allowed_url(url, allowed_domains)))
