from __future__ import annotations
import hashlib
import re
from dataclasses import dataclass
from urllib.parse import urljoin
import httpx
from .keywords import OPC_PRIORITY_KEYWORDS

def normalized_fingerprint(text: str) -> str:
    return hashlib.sha256(re.sub(r"\s+", "", text).lower().encode()).hexdigest()

def classify_content(text: str, keywords: tuple[str, ...] = OPC_PRIORITY_KEYWORDS) -> dict[str, float]:
    matched = [word for word in keywords if word.lower() in text.lower()]
    return {word: round(1 / len(matched), 2) for word in matched} if matched else {}

def make_summary(text: str) -> dict[str, object]:
    clean = re.sub(r"\s+", " ", text).strip()
    phrases = re.findall(r"[\u4e00-\u9fa5]{2,8}", clean)
    return {"summary": clean[:160], "keywords": list(dict.fromkeys(phrases))[:5], "entities": re.findall(r"[A-Z][A-Za-z0-9& -]{2,30}", clean)[:5], "model_version": "rule-based-v1", "needs_review": True}

@dataclass(frozen=True)
class LinkCheckResult: status_code: int | None; redirect_url: str | None; is_healthy: bool; error: str | None
def check_original_link(url: str, timeout_seconds: float = 10) -> LinkCheckResult:
    try:
        response = httpx.get(url, timeout=timeout_seconds, follow_redirects=True)
        return LinkCheckResult(response.status_code, str(response.url), 200 <= response.status_code < 400, None)
    except httpx.HTTPError as error: return LinkCheckResult(None, None, False, str(error))
