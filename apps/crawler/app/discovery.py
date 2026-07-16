from __future__ import annotations

from datetime import datetime, timezone
from xml.etree import ElementTree


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
