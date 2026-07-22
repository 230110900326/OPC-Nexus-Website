# -*- coding: utf-8 -*-
"""Public webpage enrichment and auditable heat scoring."""

from __future__ import print_function

import datetime as dt
import hashlib
import json
import math
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path


USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 OPCNewsAgent/2.0"
METRIC_LABELS = {
    "阅读": "views", "浏览": "views", "点击": "views", "播放": "views",
    "评论": "comments", "评": "comments", "点赞": "likes", "赞": "likes",
    "收藏": "favorites", "分享": "shares", "转发": "shares",
}


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


class PageParser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self, convert_charrefs=True)
        self.meta = {}
        self.title_parts = []
        self.paragraphs = []
        self.visible_chunks = []
        self.json_ld_parts = []
        self.dom_metrics = []
        self._skip_depth = 0
        self._title_depth = 0
        self._paragraph_depth = 0
        self._paragraph_buffer = []
        self._json_ld_depth = 0
        self._json_ld_buffer = []
        self._active_metric = None
        self._active_metric_tag = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        tag = tag.lower()
        class_name = (attrs.get("class") or "").lower()
        metric = None
        if re.search(r"comment", class_name):
            metric = "comments"
        elif re.search(r"favorite|collect", class_name):
            metric = "favorites"
        elif re.search(r"thumb|like|praise|\bzan\b", class_name):
            metric = "likes"
        elif re.search(r"view|read|click", class_name):
            metric = "views"
        if metric:
            self._active_metric = metric
            self._active_metric_tag = tag
        if tag in ("style", "noscript", "svg"):
            self._skip_depth += 1
        if tag == "script":
            script_type = (attrs.get("type") or "").lower()
            if "ld+json" in script_type:
                self._json_ld_depth += 1
            else:
                self._skip_depth += 1
        if tag == "meta":
            key = attrs.get("property") or attrs.get("name") or attrs.get("itemprop")
            value = attrs.get("content")
            if key and value:
                self.meta[key.lower()] = clean(value)
        elif tag == "title":
            self._title_depth += 1
        elif tag == "p":
            self._paragraph_depth += 1
            self._paragraph_buffer = []

    def handle_endtag(self, tag):
        tag = tag.lower()
        if self._active_metric_tag == tag:
            self._active_metric = None
            self._active_metric_tag = None
        if tag in ("style", "noscript", "svg") and self._skip_depth:
            self._skip_depth -= 1
        if tag == "script":
            if self._json_ld_depth:
                text = clean("".join(self._json_ld_buffer))
                if text:
                    self.json_ld_parts.append(text)
                self._json_ld_buffer = []
                self._json_ld_depth -= 1
            elif self._skip_depth:
                self._skip_depth -= 1
        elif tag == "title" and self._title_depth:
            self._title_depth -= 1
        elif tag == "p" and self._paragraph_depth:
            text = clean("".join(self._paragraph_buffer))
            if text:
                self.paragraphs.append(text)
            self._paragraph_buffer = []
            self._paragraph_depth -= 1

    def handle_data(self, data):
        if self._json_ld_depth:
            self._json_ld_buffer.append(data)
            return
        if self._skip_depth:
            return
        text = clean(data)
        if not text:
            return
        if self._active_metric:
            match = re.fullmatch(r"([0-9,.]+)\s*([万亿kKwW]?)", text)
            if match:
                value = number_value(match.group(1), match.group(2))
                if value is not None:
                    self.dom_metrics.append({"metric": self._active_metric, "value": value, "source": "dom_class", "confidence": "high", "evidence": text})
        if self._title_depth:
            self.title_parts.append(text)
        if self._paragraph_depth:
            self._paragraph_buffer.append(text)
        if len(text) <= 160:
            self.visible_chunks.append(text)


def decode_response(data, content_type):
    match = re.search(r"charset=([\w-]+)", content_type or "", flags=re.I)
    encodings = [match.group(1)] if match else []
    encodings.extend(["utf-8", "gb18030"])
    for encoding in encodings:
        try:
            return data.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            pass
    return data.decode("utf-8", errors="replace")


def walk_json(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            for item in walk_json(child):
                yield item
    elif isinstance(value, list):
        for child in value:
            for item in walk_json(child):
                yield item


def parse_json_ld(parts):
    objects = []
    for text in parts:
        try:
            objects.append(json.loads(text))
        except ValueError:
            continue
    return objects


def first_json_ld_value(objects, keys):
    for root in objects:
        for item in walk_json(root):
            for key in keys:
                value = item.get(key)
                if isinstance(value, str) and clean(value):
                    return clean(value)
    return ""


def number_value(value, unit=""):
    try:
        number = float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        return None
    unit = (unit or "").lower()
    if unit in ("k", "千"):
        number *= 1000
    elif unit == "万" or unit == "w":
        number *= 10000
    elif unit == "亿":
        number *= 100000000
    return int(number)


def extract_json_ld_metrics(objects):
    metrics = []
    for root in objects:
        for item in walk_json(root):
            if "userInteractionCount" not in item:
                continue
            value = number_value(item.get("userInteractionCount"))
            if value is None:
                continue
            interaction = item.get("interactionType", "")
            if isinstance(interaction, dict):
                interaction = interaction.get("@type", "")
            lowered = str(interaction).lower()
            metric = "views"
            if "comment" in lowered:
                metric = "comments"
            elif "like" in lowered:
                metric = "likes"
            elif "share" in lowered:
                metric = "shares"
            metrics.append({"metric": metric, "value": value, "source": "json_ld", "confidence": "high"})
    return metrics


def extract_visible_metrics(chunks, title):
    metrics = []
    forward = re.compile(r"(阅读|浏览|点击|播放|评论|点赞|收藏|分享|转发)\s*[:：]?\s*([0-9,.]+)\s*([万亿kKwW]?)")
    reverse = re.compile(r"([0-9,.]+)\s*([万亿kKwW]?)\s*(阅读|浏览|点击|播放|评论|点赞|收藏|分享|转发)")
    title_comment = re.search(r"([0-9,.]+)\s*([万亿kKwW]?)\s*评(?:\s|$)", title or "")
    if title_comment:
        value = number_value(title_comment.group(1), title_comment.group(2))
        if value is not None:
            metrics.append({"metric": "comments", "value": value, "source": "title", "confidence": "medium", "evidence": title_comment.group(0)})
    for index, chunk in enumerate(chunks):
        nearby = " ".join(chunks[max(0, index - 2): min(len(chunks), index + 3)])
        if re.search(r"文章数|作者|粉丝|关注|累计阅读", nearby):
            continue
        matches = []
        for match in forward.finditer(chunk):
            matches.append((match.group(1), match.group(2), match.group(3), match.group(0)))
        for match in reverse.finditer(chunk):
            matches.append((match.group(3), match.group(1), match.group(2), match.group(0)))
        for label, raw_value, unit, evidence in matches:
            value = number_value(raw_value, unit)
            if value is not None:
                metrics.append({"metric": METRIC_LABELS[label], "value": value, "source": "visible_text", "confidence": "medium", "evidence": evidence})
    deduped = []
    seen = set()
    for item in metrics:
        key = (item["metric"], item["value"])
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped


def useful_paragraphs(paragraphs):
    ignored = re.compile(r"版权所有|免责声明|未经授权|违法和不良信息|ICP备|联系我们|关于我们|责任编辑")
    result = []
    seen = set()
    for text in paragraphs:
        if len(text) < 20 or ignored.search(text):
            continue
        if text in seen:
            continue
        seen.add(text)
        result.append(text)
    return result


def parse_page(html_text, final_url, status):
    parser = PageParser()
    parser.feed(html_text)
    json_ld = parse_json_ld(parser.json_ld_parts)
    body = first_json_ld_value(json_ld, ("articleBody",))
    paragraphs = useful_paragraphs(parser.paragraphs)
    if not body:
        body = "\n".join(paragraphs)
    body = body[:50000]
    title = first_json_ld_value(json_ld, ("headline", "name")) or parser.meta.get("og:title", "") or clean(" ".join(parser.title_parts))
    summary = first_json_ld_value(json_ld, ("description",)) or parser.meta.get("description", "") or parser.meta.get("og:description", "")
    published = first_json_ld_value(json_ld, ("datePublished",))
    if not published:
        for key in ("article:published_time", "publishdate", "pubdate", "date"):
            if parser.meta.get(key):
                published = parser.meta[key]
                break
    date_pattern = re.compile(r"20\d{2}[年/-]\d{1,2}[月/-]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?")
    for chunk in parser.visible_chunks[:120]:
        match = date_pattern.search(chunk)
        if match:
            published = match.group(0)
            break
    if not published:
        published = first_json_ld_value(json_ld, ("dateCreated",))
    metrics = extract_json_ld_metrics(json_ld)
    metrics.extend(parser.dom_metrics)
    metrics.extend(extract_visible_metrics(parser.visible_chunks, title))
    deduped_metrics = []
    seen_metrics = set()
    for item in metrics:
        key = (item.get("metric"), item.get("value"))
        if key not in seen_metrics:
            seen_metrics.add(key)
            deduped_metrics.append(item)
    return {
        "ok": True,
        "status": status,
        "final_url": final_url,
        "page_title": title,
        "summary": summary[:1000],
        "content": body,
        "published_time": published,
        "metrics": deduped_metrics,
        "paragraph_count": len(paragraphs),
    }


def cache_path(cache_dir, url):
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
    return Path(cache_dir) / (digest + ".json")


def fetch_page(url, cache_dir, timeout=12, retries=1, max_bytes=2097152, use_cache=True):
    path = cache_path(cache_dir, url)
    if use_cache and path.exists():
        try:
            with path.open("r", encoding="utf-8") as handle:
                cached = json.load(handle)
            cached["cache_hit"] = True
            return cached
        except (ValueError, OSError):
            pass
    result = None
    for attempt in range(retries + 1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
            with urllib.request.urlopen(request, timeout=timeout) as response:
                content_type = response.headers.get("Content-Type", "")
                data = response.read(max_bytes + 1)
                truncated = len(data) > max_bytes
                data = data[:max_bytes]
                if "html" not in content_type.lower() and not data.lstrip().startswith(b"<"):
                    raise ValueError("响应不是 HTML：" + content_type)
                text = decode_response(data, content_type)
                result = parse_page(text, response.geturl(), getattr(response, "status", 200))
                result["truncated"] = truncated
                result["fetched_at"] = dt.datetime.now().astimezone().isoformat()
                result["cache_hit"] = False
                break
        except Exception as exc:
            result = {"ok": False, "url": url, "error": str(exc), "fetched_at": dt.datetime.now().astimezone().isoformat(), "cache_hit": False}
            if attempt < retries:
                time.sleep(0.5 * (attempt + 1))
    Path(cache_dir).mkdir(parents=True, exist_ok=True)
    try:
        with path.open("w", encoding="utf-8") as handle:
            json.dump(result, handle, ensure_ascii=False)
    except OSError:
        pass
    return result


def parse_date(value):
    text = clean(value)
    if not text:
        return None
    text = text.replace("年", "-").replace("月", "-").replace("日", " ").replace("/", "-")
    text = re.sub(r"Z$", "+00:00", text)
    try:
        return dt.datetime.fromisoformat(text)
    except (ValueError, AttributeError):
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%m-%d %H:%M"):
        try:
            parsed = dt.datetime.strptime(text.strip(), fmt)
            if fmt.startswith("%m"):
                parsed = parsed.replace(year=dt.datetime.now().year)
            return parsed
        except ValueError:
            continue
    return None


def log_score(value, scale, maximum):
    if not value or value <= 0:
        return 0
    return min(maximum, int(round(math.log10(value + 1) * scale)))


def heat_analyze(article, page, config, now=None):
    now = now or dt.datetime.now()
    metrics = (page or {}).get("metrics", []) if page else []
    best = {}
    evidence = []
    for item in metrics:
        metric = item.get("metric")
        value = int(item.get("value") or 0)
        if value > best.get(metric, 0):
            best[metric] = value
        evidence.append(item)
    score = 0
    if best.get("views"):
        score += log_score(best["views"], 13, 65)
    score += log_score(best.get("comments", 0), 5, 18)
    score += log_score(best.get("likes", 0), 4, 14)
    score += log_score(best.get("favorites", 0), 3, 10)
    score += log_score(best.get("shares", 0), 3, 10)

    published = None if article.get("time_is_fallback") else parse_date(article.get("publish_time"))
    if not published:
        title = article.get("title") or ""
        hours = re.search(r"(\d+)\s*小时前", title)
        days = re.search(r"(\d+)\s*天前", title)
        if hours:
            published = now - dt.timedelta(hours=int(hours.group(1)))
        elif days:
            published = now - dt.timedelta(days=int(days.group(1)))
        elif "昨天" in title:
            published = now - dt.timedelta(days=1)
    freshness = 0
    if published:
        if published.tzinfo:
            published = published.replace(tzinfo=None)
        age_days = max(0, (now - published).total_seconds() / 86400.0)
        if age_days <= 1:
            freshness = 20
        elif age_days <= 3:
            freshness = 16
        elif age_days <= 7:
            freshness = 12
        elif age_days <= 30:
            freshness = 8
        elif age_days <= 90:
            freshness = 4
    score += freshness
    source_score = int(config.get("source_scores", {}).get(article.get("source"), 5))
    score += source_score
    event_hits = [term for term in config.get("event_terms", []) if term.lower() in (article.get("title") or "").lower()]
    event_score = min(5, len(event_hits) * 2)
    score += event_score

    has_article_metric = bool(best)
    if not has_article_metric:
        score = min(score, 45)
        basis = "estimated"
        confidence = "low"
    else:
        basis = "article_metrics"
        confidence = "high" if any(item.get("confidence") == "high" for item in metrics) else "medium"
    score = min(100, score)
    if score >= 70:
        tier = "high"
    elif score >= 45:
        tier = "medium"
    elif score >= 25:
        tier = "low"
    else:
        tier = "unknown" if not has_article_metric else "low"
    return {
        "heat_score": score,
        "heat_tier": tier,
        "heat_basis": basis,
        "heat_confidence": confidence,
        "article_metrics": best,
        "heat_evidence": evidence,
        "freshness_score": freshness,
        "source_signal_score": source_score,
        "event_signal_score": event_score,
        "event_terms": event_hits,
    }
