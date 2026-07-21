#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Local news filtering agent for OPC (one-person company) intelligence."""

from __future__ import print_function

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv
import datetime as dt
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from .web_enrichment import fetch_page, heat_analyze


VERSION = "2.0.1"
ARTICLE_ARRAY_KEYS = ("articles", "items", "results", "news", "data")
FIELD_ALIASES = {
    "id": ("id", "article_id", "news_id", "uuid"),
    "title": ("title", "headline", "name"),
    "url": ("url", "link", "source_url", "original_url"),
    "source": ("source", "media", "source_name", "site_name"),
    "publish_time": ("publish_time", "published_at", "published_time", "pub_time", "date", "time"),
    "summary": ("summary", "description", "abstract", "digest"),
    "content": ("content", "body", "text", "article_content", "full_text"),
    "keywords": ("keywords", "tags", "keyword"),
    "created_at": ("created_at", "crawl_time", "crawled_at", "collected_at"),
}


def eprint(*args):
    print(*args, file=sys.stderr)


def read_json(path):
    with Path(path).open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def write_json(path, value):
    with Path(path).open("w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)


def deep_merge(base, override):
    result = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def load_config(path):
    default_path = Path(__file__).with_name("config.json")
    config = read_json(default_path)
    if path and Path(path).resolve() != default_path.resolve():
        config = deep_merge(config, read_json(path))
    return config


def find_article_list(root):
    if isinstance(root, list):
        return root, {"top_level": "array"}
    if not isinstance(root, dict):
        raise ValueError("JSON 顶层必须是对象或数组。")
    for key in ARTICLE_ARRAY_KEYS:
        value = root.get(key)
        if isinstance(value, list):
            meta = {k: v for k, v in root.items() if k != key and not isinstance(v, (list, dict))}
            meta["article_array_field"] = key
            return value, meta
        if isinstance(value, dict):
            for nested_key in ARTICLE_ARRAY_KEYS:
                nested = value.get(nested_key)
                if isinstance(nested, list):
                    return nested, {"article_array_field": "%s.%s" % (key, nested_key)}
    raise ValueError("没有找到资讯数组，支持的字段包括：%s" % ", ".join(ARTICLE_ARRAY_KEYS))


def pick(raw, aliases):
    for key in aliases:
        value = raw.get(key)
        if value is not None and value != "":
            return value
    return None


def clean_text(value):
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        value = "、".join(clean_text(item) for item in value if item is not None)
    elif isinstance(value, dict):
        value = json.dumps(value, ensure_ascii=False)
    else:
        value = str(value)
    value = html.unescape(value)
    value = re.sub(r"<script\b[^>]*>.*?</script>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<style\b[^>]*>.*?</style>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def normalize_article(raw, index):
    if not isinstance(raw, dict):
        raw = {"content": raw}
    article = {name: clean_text(pick(raw, aliases)) for name, aliases in FIELD_ALIASES.items()}
    article["id"] = article["id"] or str(index + 1)
    article["row_index"] = index
    if not article["publish_time"]:
        article["publish_time"] = article["created_at"]
        article["time_is_fallback"] = bool(article["created_at"])
    else:
        article["time_is_fallback"] = False
    article["data_quality"] = data_quality(article)
    return article


def data_quality(article):
    if article.get("content"):
        return "full_text"
    if article.get("summary"):
        return "summary_only"
    if article.get("title"):
        return "title_only"
    return "insufficient"


def canonical_url(url):
    if not url:
        return ""
    try:
        parsed = urllib.parse.urlsplit(url.strip())
        ignored = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "spm", "from"}
        query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
        query = [(k, v) for k, v in query if k.lower() not in ignored]
        return urllib.parse.urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path.rstrip("/"), urllib.parse.urlencode(query), ""))
    except Exception:
        return url.strip()


def normalized_title(title):
    return re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "", (title or "").lower())


def deduplicate(articles):
    unique = []
    duplicates = []
    seen = {}
    for article in articles:
        url_key = canonical_url(article.get("url"))
        title_key = normalized_title(article.get("title"))
        keys = []
        if url_key:
            keys.append("url:" + url_key)
        if title_key:
            keys.append("title:" + title_key)
        duplicate_of = next((seen[key] for key in keys if key in seen), None)
        if duplicate_of is not None:
            duplicates.append({"article": article, "duplicate_of": duplicate_of})
            continue
        unique.append(article)
        identity = article.get("id") or str(article.get("row_index"))
        for key in keys:
            seen[key] = identity
    return unique, duplicates


def contains_term(text, term):
    if not text or not term:
        return False
    if re.match(r"^[A-Za-z0-9 ._-]+$", term):
        pattern = r"(?<![A-Za-z0-9])" + re.escape(term) + r"(?![A-Za-z0-9])"
        return re.search(pattern, text, flags=re.I) is not None
    if term == "创业":
        return re.search(r"创业(?!板)", text) is not None
    return term.lower() in text.lower()


def collect_matches(article, term_defs, field_weights):
    matches = []
    for item in term_defs:
        term = item["term"]
        base_weight = float(item["weight"])
        for field, field_weight in field_weights.items():
            text = article.get(field, "")
            if contains_term(text, term):
                matches.append({
                    "term": term,
                    "field": field,
                    "weight": round(base_weight * float(field_weight), 2),
                })
    return matches


def evidence_snippet(text, term, radius=70):
    if not text:
        return ""
    lowered = text.lower()
    index = lowered.find(term.lower())
    if index < 0:
        return text[: radius * 2]
    start = max(0, index - radius)
    end = min(len(text), index + len(term) + radius)
    prefix = "…" if start else ""
    suffix = "…" if end < len(text) else ""
    return prefix + text[start:end] + suffix


def classify_article(article, config, has_positive):
    text = " ".join(article.get(field, "") for field in ("title", "keywords", "summary", "content"))
    policy_hits = [term for term in config["topic"]["policy_terms"] if contains_term(text, term)]
    if policy_hits:
        if any(token in text for token in ("解读", "详解", "问答", "释义")):
            return "policy_interpretation", policy_hits
        return "policy", policy_hits
    if has_positive and re.search(r"案例|故事|创办|打造|创始人|创业者|程序员|日赚|年入", text, flags=re.I):
        return "case_study", []
    return "news", []


def split_sentences(text):
    if not text:
        return []
    pieces = re.split(r"(?<=[。！？!?；;])\s*|\n+", text)
    return [piece.strip() for piece in pieces if len(piece.strip()) >= 8]


def extract_summary(article, terms, policy_terms):
    if article.get("summary"):
        sentences = split_sentences(article["summary"])
        selected = sentences[:3] if sentences else [article["summary"][:400]]
        return "".join(selected)[:600], selected[:3]
    if article.get("content"):
        sentences = split_sentences(article["content"])
        scored = []
        for index, sentence in enumerate(sentences):
            score = 1.5 if index == 0 else 0.0
            score += sum(3 for term in terms if contains_term(sentence, term))
            score += sum(1 for term in policy_terms if contains_term(sentence, term))
            score += min(len(sentence), 160) / 320.0
            scored.append((score, index, sentence))
        chosen = sorted(scored, reverse=True)[:3]
        chosen = [item[2] for item in sorted(chosen, key=lambda item: item[1])]
        return "".join(chosen)[:800], chosen
    if article.get("title"):
        return "标题信息：" + article["title"], [article["title"]]
    return "没有足够文本生成摘要。", []


def analyze_ecosystem_dimensions(article, config, field_weights):
    paths = []
    for dimension in config["topic"].get("ecosystem_dimensions", []):
        matches = collect_matches(article, dimension.get("terms", []), field_weights)
        if not matches:
            continue
        paths.append({
            "id": dimension["id"],
            "label": dimension["label"],
            "relation_level": dimension.get("relation_level", "contextual"),
            "opc_impact": dimension.get("opc_impact", ""),
            "score": round(sum(item["weight"] for item in matches), 2),
            "matched_terms": sorted(set(item["term"] for item in matches)),
            "matches": matches,
        })
    return sorted(paths, key=lambda item: item["score"], reverse=True)


def rule_analyze(article, config):
    field_weights = config["scoring"]["field_weights"]
    positive = collect_matches(article, config["topic"]["positive_terms"], field_weights)
    negative = collect_matches(article, config["topic"]["negative_terms"], field_weights)
    context = collect_matches(article, config["topic"]["context_terms"], field_weights) if positive else []
    relation_paths = analyze_ecosystem_dimensions(article, config, field_weights)
    positive_score = sum(item["weight"] for item in positive)
    strongest_positive = max((float(item["weight"]) / float(field_weights[item["field"]]) for item in positive), default=0.0)
    context_multiplier = 1.0 if strongest_positive >= 8.0 else 0.25
    context_score = sum(item["weight"] for item in context) * context_multiplier
    negative_score = sum(item["weight"] for item in negative)
    dimension_score = sum(item["score"] for item in relation_paths)
    strongest_dimension = max((item["score"] for item in relation_paths), default=0.0)
    signal_score = positive_score + context_score + dimension_score
    raw_score = max(0.0, signal_score - negative_score)

    primary_fields = {"title", "keywords", "summary"}
    primary_positive_score = sum(item["weight"] for item in positive if item["field"] in primary_fields)
    primary_context_score = sum(item["weight"] for item in context if item["field"] in primary_fields) * context_multiplier
    primary_negative_score = sum(item["weight"] for item in negative if item["field"] in primary_fields)
    primary_path_scores = []
    for path in relation_paths:
        path_score = sum(item["weight"] for item in path["matches"] if item["field"] in primary_fields)
        if path_score > 0:
            primary_path_scores.append(path_score)
    primary_dimension_score = sum(primary_path_scores)
    primary_strongest_dimension = max(primary_path_scores, default=0.0)
    primary_raw_score = max(0.0, primary_positive_score + primary_context_score + primary_dimension_score - primary_negative_score)
    content_only_signal = primary_raw_score == 0 and raw_score > 0

    relevant_threshold = float(config["scoring"]["relevant_threshold"])
    review_threshold = float(config["scoring"]["review_threshold"])
    hard_excluded = bool(negative) and negative_score >= signal_score
    if hard_excluded:
        decision = "irrelevant"
    elif primary_positive_score + primary_context_score >= relevant_threshold:
        decision = "relevant"
    elif primary_strongest_dimension >= 12.0:
        decision = "relevant"
    elif len(primary_path_scores) >= 2 and primary_raw_score >= 14.0:
        decision = "relevant"
    elif primary_positive_score + primary_context_score >= review_threshold or primary_strongest_dimension >= 5.0 or primary_raw_score >= 7.0:
        decision = "review"
    elif positive_score >= 12.0 or strongest_dimension >= 12.0 or (len(relation_paths) >= 2 and raw_score >= 16.0):
        decision = "review"
    else:
        decision = "irrelevant"

    category, policy_hits = classify_article(article, config, bool(positive or relation_paths))
    dimension_matches = [match for path in relation_paths for match in path["matches"]]
    matched_terms = sorted(set(item["term"] for item in positive + context + dimension_matches))
    excluded_terms = sorted(set(item["term"] for item in negative))
    summary, key_points = extract_summary(article, matched_terms, config["topic"]["policy_terms"])
    evidence = []
    for item in (positive + dimension_matches)[:8]:
        evidence.append({
            "field": item["field"],
            "term": item["term"],
            "text": evidence_snippet(article.get(item["field"], ""), item["term"]),
        })

    direct_normalized = min(100.0, 50.0 + (positive_score + context_score) * 1.8) if positive else 0.0
    ecosystem_normalized = min(85.0, 35.0 + strongest_dimension * 2.0 + min(20.0, max(0, len(relation_paths) - 1) * 5.0)) if relation_paths else 0.0
    normalized_score = min(100, int(round(max(direct_normalized, ecosystem_normalized) - negative_score * 2.0)))
    normalized_score = max(0, normalized_score)
    if decision == "review":
        normalized_score = min(69, normalized_score)
    elif decision == "irrelevant":
        normalized_score = min(49, normalized_score)
    if decision == "irrelevant" and not positive and not relation_paths:
        normalized_score = 0
    if article["data_quality"] == "title_only":
        confidence = "medium" if decision != "review" else "low"
    else:
        confidence = "high" if decision != "review" else "medium"

    reasons = []
    if positive:
        reasons.append("直接命中 OPC 主题词：" + "、".join(sorted(set(item["term"] for item in positive))))
    if relation_paths:
        reasons.append("OPC 关联路径：" + "；".join("%s：%s（命中 %s）" % (path["label"], path.get("opc_impact", ""), "、".join(path["matched_terms"])) for path in relation_paths[:4]))
    if not positive and not relation_paths:
        reasons.append("没有找到可解释的 OPC 经营或发展关联路径")
    if content_only_signal:
        reasons.append("关联词仅出现在网页正文，缺少标题或摘要主信号，已降级为正文级复核")
    if context:
        reasons.append("存在公司/创业/监管语境")
    if negative:
        reasons.append("命中工业通信等排除词：" + "、".join(excluded_terms))
    if article["data_quality"] == "title_only":
        reasons.append("原始记录只有标题，不能核实正文细节")

    actions = []
    if decision in ("relevant", "review") and article["data_quality"] == "title_only":
        actions.append("访问原文补全正文后，再核实关联性与实际影响")
    elif category in ("policy", "policy_interpretation") and decision != "irrelevant":
        actions.append("核对发布机构、适用地区、生效时间和原文条款")

    if positive_score > 0:
        relation_level = "core"
    elif relation_paths:
        relation_level = relation_paths[0]["relation_level"]
    else:
        relation_level = "none"

    return {
        "decision": decision,
        "relevance_score": normalized_score,
        "raw_rule_score": round(raw_score, 2),
        "confidence": confidence,
        "category": category,
        "importance_score": min(100, normalized_score + (10 if policy_hits else 0)),
        "relation_level": relation_level,
        "relation_paths": [{k: v for k, v in path.items() if k != "matches"} for path in relation_paths],
        "ecosystem_score_raw": round(dimension_score, 2),
        "content_only_signal": content_only_signal,
        "reason": "；".join(reasons),
        "core_summary": summary,
        "key_points": key_points,
        "jurisdiction": None,
        "issuing_authority": None,
        "effective_date": None,
        "affected_entities": [],
        "policy_implications": [],
        "action_items": actions,
        "evidence": evidence,
        "matched_terms": matched_terms,
        "excluded_terms": excluded_terms,
        "policy_terms": policy_hits,
        "analysis_mode": "rules",
    }


SYSTEM_PROMPT = """你是 OPC（一人公司）生态资讯分析智能体。相关范围不仅包括一人公司本身，还包括能帮助个人完成创办、经营、增长与合规的外部变化：AI/智能体/自动化/低代码、生产力工具、创业与个体经营、获客和电商、融资、工商税务、用工、知识产权、数据合规及相关政策。只有无法说明对一人公司能力、成本、机会或约束有何影响的内容才判为 irrelevant。工业通信协议 Open Platform Communications 不是本主题。
请严格依据输入文字判断，不能补充输入中没有的事实。若只有标题，必须降低置信度，不得猜测正文、金额、地区、机构或政策影响。
只返回一个 JSON 对象，字段为：decision(relevant/review/irrelevant)、relevance_score(0-100)、confidence(high/medium/low)、category(news/policy/policy_interpretation/case_study)、relation_level(core/enabling/operational/contextual/none)、reason、core_summary、key_points(数组)、jurisdiction、issuing_authority、effective_date、affected_entities(数组)、policy_implications(数组)、action_items(数组)、evidence(数组，必须是输入中的原文短句)。"""


def article_for_llm(article, rule_result, max_chars):
    payload = {
        "title": article.get("title"),
        "source": article.get("source"),
        "publish_time": article.get("publish_time"),
        "keywords": article.get("keywords"),
        "summary": article.get("summary"),
        "content": article.get("content", "")[:max_chars],
        "data_quality": article.get("data_quality"),
        "web_metrics": article.get("web_enrichment", {}).get("metrics", []),
        "rule_result": {
            "decision": rule_result.get("decision"),
            "score": rule_result.get("relevance_score"),
            "matched_terms": rule_result.get("matched_terms"),
            "excluded_terms": rule_result.get("excluded_terms"),
        },
    }
    return json.dumps(payload, ensure_ascii=False)


def http_post_json(url, payload, headers, timeout):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def extract_json_object(text):
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except ValueError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start:end + 1])
        raise


def call_openai(article_text, model, url, timeout):
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("未设置环境变量 OPENAI_API_KEY。")
    if not model:
        raise RuntimeError("OpenAI 模式需要通过 --model 或 config.json 指定模型。")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": article_text},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    response = http_post_json(url, payload, {
        "Authorization": "Bearer " + api_key,
        "Content-Type": "application/json",
    }, timeout)
    return extract_json_object(response["choices"][0]["message"]["content"])


def call_ollama(article_text, model, url, timeout):
    if not model:
        raise RuntimeError("Ollama 模式需要通过 --model 指定本机已安装的模型。")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": article_text},
        ],
        "format": "json",
        "stream": False,
        "options": {"temperature": 0},
    }
    response = http_post_json(url, payload, {"Content-Type": "application/json"}, timeout)
    return extract_json_object(response["message"]["content"])


def validate_llm_result(value):
    if not isinstance(value, dict):
        raise ValueError("模型返回值不是 JSON 对象。")
    if value.get("decision") not in ("relevant", "review", "irrelevant"):
        raise ValueError("模型返回了无效 decision。")
    try:
        value["relevance_score"] = max(0, min(100, int(value.get("relevance_score", 0))))
    except (TypeError, ValueError):
        value["relevance_score"] = 0
    for key in ("key_points", "affected_entities", "policy_implications", "action_items", "evidence"):
        if not isinstance(value.get(key), list):
            value[key] = []
    value["analysis_mode"] = "llm"
    return value


def llm_analyze(article, rule_result, config, provider, model, base_url):
    processing = config["processing"]
    timeout = int(processing.get("request_timeout_seconds", 90))
    retries = int(processing.get("request_retries", 2))
    max_chars = int(processing.get("max_content_chars_for_llm", 12000))
    article_text = article_for_llm(article, rule_result, max_chars)
    error = None
    for attempt in range(retries + 1):
        try:
            if provider == "openai":
                value = call_openai(article_text, model, base_url, timeout)
            elif provider == "ollama":
                value = call_ollama(article_text, model, base_url, timeout)
            else:
                raise ValueError("不支持的模型提供方：" + provider)
            return validate_llm_result(value)
        except Exception as exc:
            error = exc
            if attempt < retries:
                time.sleep(1.5 * (attempt + 1))
    fallback = dict(rule_result)
    fallback["analysis_mode"] = "rules_fallback"
    fallback["llm_error"] = str(error)
    return fallback


def should_use_llm(rule_result, scope):
    if scope == "all":
        return True
    if scope == "relevant":
        return rule_result["decision"] == "relevant"
    return rule_result["decision"] in ("relevant", "review")


def compact_web_result(page):
    if not page:
        return {"attempted": False}
    if not page.get("ok"):
        return {
            "attempted": True,
            "ok": False,
            "error": page.get("error"),
            "cache_hit": page.get("cache_hit", False),
        }
    return {
        "attempted": True,
        "ok": True,
        "status": page.get("status"),
        "final_url": page.get("final_url"),
        "page_title": page.get("page_title"),
        "published_time": page.get("published_time"),
        "content_length": len(page.get("content", "")),
        "paragraph_count": page.get("paragraph_count", 0),
        "metrics": page.get("metrics", []),
        "cache_hit": page.get("cache_hit", False),
        "truncated": page.get("truncated", False),
    }


def apply_page_enrichment(article, page):
    article["web_enrichment"] = compact_web_result(page)
    if not page or not page.get("ok"):
        return
    if not article.get("summary") and page.get("summary"):
        article["summary"] = clean_text(page["summary"])
    if not article.get("content") and page.get("content"):
        article["content"] = clean_text(page["content"])
    if (not article.get("publish_time") or article.get("time_is_fallback")) and page.get("published_time"):
        article["publish_time"] = clean_text(page["published_time"])
        article["time_is_fallback"] = False
    article["data_quality"] = data_quality(article)


def fetch_and_enrich(articles, initial_results, args, config):
    processing = config["processing"]
    scope = args.fetch_scope or processing.get("fetch_scope", "all")
    candidates = []
    for article, analysis in zip(articles, initial_results):
        if not article.get("url"):
            continue
        if scope == "candidates" and analysis["decision"] == "irrelevant":
            continue
        priority = {"relevant": 0, "review": 1, "irrelevant": 2}[analysis["decision"]]
        candidates.append((priority, -analysis.get("relevance_score", 0), article))
    candidates.sort(key=lambda item: (item[0], item[1]))
    if args.max_pages and args.max_pages > 0:
        candidates = candidates[:args.max_pages]

    cache_dir = args.cache_dir or str(Path(__file__).parent / "page_cache")
    timeout = int(processing.get("fetch_timeout_seconds", 12))
    retries = int(processing.get("fetch_retries", 1))
    max_bytes = int(processing.get("fetch_max_bytes", 2097152))
    workers = args.workers or int(processing.get("fetch_workers", 6))
    page_by_index = {}
    if not candidates:
        return page_by_index, {"requested": 0, "success": 0, "failed": 0, "cache_hits": 0}

    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        futures = {}
        for _, _, article in candidates:
            future = executor.submit(
                fetch_page, article["url"], cache_dir, timeout, retries, max_bytes, not args.no_cache
            )
            futures[future] = article
        completed = 0
        for future in as_completed(futures):
            article = futures[future]
            try:
                page = future.result()
            except Exception as exc:
                page = {"ok": False, "error": str(exc), "cache_hit": False}
            page_by_index[article["row_index"]] = page
            apply_page_enrichment(article, page)
            completed += 1
            if completed % 25 == 0 or completed == len(candidates):
                eprint("网页补全 %s/%s" % (completed, len(candidates)))

    values = list(page_by_index.values())
    stats = {
        "requested": len(candidates),
        "success": sum(1 for page in values if page.get("ok")),
        "failed": sum(1 for page in values if not page.get("ok")),
        "cache_hits": sum(1 for page in values if page.get("cache_hit")),
    }
    return page_by_index, stats


def result_record(article, analysis):
    return {
        "article_id": article.get("id"),
        "title": article.get("title"),
        "url": article.get("url"),
        "source": article.get("source"),
        "publish_time": article.get("publish_time"),
        "time_is_fallback": article.get("time_is_fallback"),
        "keywords": article.get("keywords"),
        "data_quality": article.get("data_quality"),
        "web_enrichment": article.get("web_enrichment", {"attempted": False}),
        "analysis": analysis,
    }


def write_jsonl(path, rows):
    with Path(path).open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def csv_value(value):
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    return "" if value is None else value


def write_csv(path, rows):
    fields = [
        "article_id", "title", "source", "publish_time", "url", "data_quality",
        "decision", "relevance_score", "priority_score", "importance_score", "confidence", "category",
        "relation_level", "relation_paths", "heat_score", "heat_tier", "heat_basis", "heat_confidence",
        "article_metrics", "core_summary", "reason", "matched_terms", "excluded_terms", "action_items", "analysis_mode",
    ]
    with Path(path).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            analysis = row["analysis"]
            flat = {key: row.get(key) for key in fields}
            for key in fields:
                if key in analysis:
                    flat[key] = analysis.get(key)
            writer.writerow({key: csv_value(flat.get(key)) for key in fields})


def markdown_escape(value):
    return str(value or "").replace("|", "\\|").replace("\n", " ")


def write_report(path, metadata, rows):
    counts = {key: sum(1 for row in rows if row["analysis"]["decision"] == key) for key in ("relevant", "review", "irrelevant")}
    selected = [row for row in rows if row["analysis"]["decision"] in ("relevant", "review")]
    selected.sort(key=lambda row: (row["analysis"].get("priority_score", 0), row["analysis"].get("relevance_score", 0)), reverse=True)
    hot = [row for row in selected if row["analysis"].get("heat_score", 0) >= metadata.get("hot_threshold", 30)]
    lines = [
        "# OPC（一人公司）资讯筛选报告",
        "",
        "- 生成时间：%s" % metadata["generated_at"],
        "- 输入记录：%s" % metadata["input_count"],
        "- 去重后记录：%s" % metadata["unique_count"],
        "- 重复记录：%s" % metadata["duplicate_count"],
        "- 明确相关：%s" % counts["relevant"],
        "- 待人工复核：%s" % counts["review"],
        "- 无关：%s" % counts["irrelevant"],
        "- 网页访问：成功 %s / 请求 %s（缓存命中 %s）" % (
            metadata.get("page_fetch", {}).get("success", 0),
            metadata.get("page_fetch", {}).get("requested", 0),
            metadata.get("page_fetch", {}).get("cache_hits", 0),
        ),
        "- 热点候选：%s（其中有公开文章互动指标 %s）" % (len(hot), metadata.get("verified_hot_count", 0)),
        "- 分析方式：%s" % metadata["provider"],
        "",
        "## OPC 热点与关联资讯",
        "",
        "热度分优先采用文章公开阅读、评论、点赞等指标；没有真实指标时使用时效性、来源和事件词估算，并标记为 `estimated`，不能视为真实点击量。",
        "",
    ]
    if not selected:
        lines.append("本次没有筛选出相关资讯。")
    else:
        lines.extend([
            "| 判定 | 相关度 | 热度 | 热度依据 | 关联路径 | 标题 | 来源 | 数据质量 |",
            "|---|---:|---:|---|---|---|---|---|",
        ])
        for row in selected[:100]:
            analysis = row["analysis"]
            title = markdown_escape(row["title"])
            if row.get("url"):
                title = "[%s](%s)" % (title, row["url"])
            path_labels = "、".join(path.get("label", "") for path in analysis.get("relation_paths", [])[:3]) or analysis.get("relation_level", "")
            lines.append("| %s | %s | %s | %s | %s | %s | %s | %s |" % (
                analysis["decision"], analysis.get("relevance_score", 0), analysis.get("heat_score", 0),
                analysis.get("heat_basis", ""), markdown_escape(path_labels), title,
                markdown_escape(row["source"]), row["data_quality"],
            ))
        if len(selected) > 100:
            lines.append("\n报告仅展示前 100 条，完整结果见 JSONL/CSV。")
        for index, row in enumerate(selected[:20], 1):
            analysis = row["analysis"]
            lines.extend([
                "",
                "### %s. %s" % (index, row["title"]),
                "",
                "- 判定：%s（相关度 %s，置信度 %s）" % (analysis["decision"], analysis.get("relevance_score", 0), analysis.get("confidence", "")),
                "- 热度：%s（%s，置信度 %s）" % (analysis.get("heat_score", 0), analysis.get("heat_basis", ""), analysis.get("heat_confidence", "")),
                "- 分类：%s" % analysis.get("category", ""),
                "- OPC 关联层级：%s" % analysis.get("relation_level", ""),
                "- 核心内容：%s" % analysis.get("core_summary", ""),
                "- 判断理由：%s" % analysis.get("reason", ""),
            ])
            if analysis.get("article_metrics"):
                lines.append("- 公开互动指标：%s" % json.dumps(analysis["article_metrics"], ensure_ascii=False))
            if analysis.get("action_items"):
                lines.append("- 后续动作：%s" % "；".join(map(str, analysis["action_items"])))
    if metadata.get("title_only_count"):
        lines.extend([
            "",
            "## 数据质量提示",
            "",
            "共有 %s 条记录只有标题。标题级结果可用于初筛，但不能替代正文事实核验和政策影响分析。" % metadata["title_only_count"],
        ])
    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8")


def run(args):
    config = load_config(args.config)
    provider = args.provider or config["llm"].get("provider", "none")
    model = args.model or config["llm"].get("model", "")
    scope = args.llm_scope or config["processing"].get("llm_scope", "candidates")
    if provider == "openai":
        base_url = args.base_url or config["llm"]["openai_base_url"]
    elif provider == "ollama":
        base_url = args.base_url or config["llm"]["ollama_base_url"]
    else:
        base_url = ""

    root = read_json(args.input)
    raw_articles, source_meta = find_article_list(root)
    articles = [normalize_article(item, index) for index, item in enumerate(raw_articles)]
    unique_articles, duplicates = deduplicate(articles)

    output_dir = Path(args.output_dir) if args.output_dir else Path(__file__).parent / "results" / dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir.mkdir(parents=True, exist_ok=True)

    initial_results = [rule_analyze(article, config) for article in unique_articles]
    page_by_index = {}
    page_stats = {"requested": 0, "success": 0, "failed": 0, "cache_hits": 0}
    if args.fetch_pages:
        page_by_index, page_stats = fetch_and_enrich(unique_articles, initial_results, args, config)

    rows = []
    llm_calls = 0
    for index, article in enumerate(unique_articles, 1):
        rule_result = rule_analyze(article, config)
        analysis = rule_result
        if provider != "none" and should_use_llm(rule_result, scope):
            llm_calls += 1
            analysis = llm_analyze(article, rule_result, config, provider, model, base_url)
            for key in ("relation_level", "relation_paths", "matched_terms", "excluded_terms", "policy_terms", "ecosystem_score_raw"):
                analysis.setdefault(key, rule_result.get(key))
        heat_result = heat_analyze(article, page_by_index.get(article["row_index"]), config.get("heat", {}))
        analysis.update(heat_result)
        analysis["priority_score"] = min(100, int(round(analysis.get("relevance_score", 0) * 0.7 + analysis.get("heat_score", 0) * 0.3)))
        analysis["importance_score"] = min(100, analysis["priority_score"] + (5 if analysis.get("category") in ("policy", "policy_interpretation") else 0))
        rows.append(result_record(article, analysis))
        if index % 100 == 0 or index == len(unique_articles):
            eprint("已处理 %s/%s" % (index, len(unique_articles)))

    relevant = [row for row in rows if row["analysis"]["decision"] == "relevant"]
    review = [row for row in rows if row["analysis"]["decision"] == "review"]
    irrelevant = [row for row in rows if row["analysis"]["decision"] == "irrelevant"]
    hot_threshold = int(config.get("heat", {}).get("hot_threshold", 30))
    hot = [row for row in relevant + review if row["analysis"].get("heat_score", 0) >= hot_threshold]
    hot.sort(key=lambda row: (row["analysis"].get("priority_score", 0), row["analysis"].get("heat_score", 0)), reverse=True)
    verified_hot = [row for row in hot if row["analysis"].get("heat_basis") == "article_metrics"]
    excel_rows = relevant + review
    excel_rows.sort(key=lambda row: (
        row["analysis"]["decision"] == "relevant",
        row["analysis"].get("priority_score", 0),
        row["analysis"].get("heat_score", 0),
    ), reverse=True)
    metadata = {
        "agent_version": VERSION,
        "generated_at": dt.datetime.now().astimezone().isoformat(),
        "input_file": str(Path(args.input).resolve()),
        "input_sha256": hashlib.sha256(Path(args.input).read_bytes()).hexdigest(),
        "input_count": len(raw_articles),
        "unique_count": len(unique_articles),
        "duplicate_count": len(duplicates),
        "title_only_count": sum(1 for item in unique_articles if item["data_quality"] == "title_only"),
        "provider": provider,
        "model": model or None,
        "llm_calls": llm_calls,
        "page_fetch": page_stats,
        "hot_threshold": hot_threshold,
        "hot_count": len(hot),
        "verified_hot_count": len(verified_hot),
        "source_metadata": source_meta,
    }

    write_json(output_dir / "run_metadata.json", metadata)
    write_jsonl(output_dir / "relevant.jsonl", relevant)
    write_jsonl(output_dir / "review.jsonl", review)
    write_jsonl(output_dir / "irrelevant.jsonl", irrelevant)
    write_jsonl(output_dir / "hot_relevant.jsonl", hot)
    write_jsonl(output_dir / "verified_hot.jsonl", verified_hot)
    write_jsonl(output_dir / "all_results.jsonl", rows)
    write_csv(output_dir / "all_results.csv", excel_rows)
    write_json(output_dir / "duplicates.json", duplicates)
    write_report(output_dir / "report.md", metadata, rows)

    summary = {
        "output_dir": str(output_dir.resolve()),
        "input": len(raw_articles),
        "unique": len(unique_articles),
        "duplicates": len(duplicates),
        "relevant": len(relevant),
        "review": len(review),
        "irrelevant": len(irrelevant),
        "hot": len(hot),
        "verified_hot": len(verified_hot),
        "excel_rows": len(excel_rows),
        "page_fetch": page_stats,
        "provider": provider,
        "llm_calls": llm_calls,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def build_parser():
    parser = argparse.ArgumentParser(description="OPC（一人公司）新闻与政策筛选智能体")
    parser.add_argument("input", help="爬虫导出的 JSON 文件")
    parser.add_argument("--output-dir", help="结果目录；默认写入项目的 results/时间戳目录")
    parser.add_argument("--config", help="自定义配置 JSON；会覆盖项目默认配置")
    parser.add_argument("--provider", choices=("none", "openai", "ollama"), help="none=本地规则，openai/ollama=语义增强")
    parser.add_argument("--model", help="模型名称；使用 openai 或 ollama 时必填")
    parser.add_argument("--base-url", help="自定义模型 API 地址")
    parser.add_argument("--llm-scope", choices=("candidates", "relevant", "all"), help="哪些资讯调用模型，默认 candidates")
    parser.add_argument("--fetch-pages", action="store_true", help="访问原文链接，补全正文、发布时间和公开互动指标")
    parser.add_argument("--fetch-scope", choices=("candidates", "all"), help="访问候选页面或全部页面；默认读取配置")
    parser.add_argument("--max-pages", type=int, default=0, help="最多访问多少个页面；0 表示不限制")
    parser.add_argument("--workers", type=int, help="网页访问并发数；默认读取配置")
    parser.add_argument("--cache-dir", help="网页缓存目录；默认使用项目 page_cache")
    parser.add_argument("--no-cache", action="store_true", help="忽略已有网页缓存并重新访问")
    parser.add_argument("--version", action="version", version=VERSION)
    return parser


if __name__ == "__main__":
    try:
        sys.exit(run(build_parser().parse_args()))
    except KeyboardInterrupt:
        eprint("已取消。")
        sys.exit(130)
    except Exception as exc:
        eprint("错误：%s" % exc)
        sys.exit(1)
