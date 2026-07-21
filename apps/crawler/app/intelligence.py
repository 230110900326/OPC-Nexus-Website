from __future__ import annotations

import logging
from typing import Any

from .config import Settings
from .znt.news_agent import VERSION, deduplicate, llm_analyze, load_config, normalize_article, rule_analyze, should_use_llm
from .znt.web_enrichment import heat_analyze, parse_page

logger = logging.getLogger(__name__)


class NewsIntelligence:
    def __init__(self, settings: Settings) -> None:
        self.enabled = bool(getattr(settings, "intelligence_enabled", True))
        self.config = load_config(getattr(settings, "intelligence_config_path", None) or None)
        self.provider = str(getattr(settings, "intelligence_provider", "none") or "none").lower()
        self.model = str(getattr(settings, "intelligence_model", "") or "")
        self.scope = str(getattr(settings, "intelligence_llm_scope", "candidates") or "candidates")
        configured_url = str(getattr(settings, "intelligence_base_url", "") or "")
        default_url = self.config["llm"].get(f"{self.provider}_base_url", "")
        self.base_url = configured_url or default_url

    def parse_page(self, html: str, url: str) -> dict[str, Any]:
        return parse_page(html, url, 200)

    def process(self, candidates: list[dict[str, Any]], source_name: str) -> tuple[list[dict[str, Any]], dict[str, int | str]]:
        if not self.enabled:
            return [self._public_candidate(item) for item in candidates], {"filtered": 0, "duplicates": 0, "agentVersion": "disabled"}

        articles = [self._normalize(item, source_name, index) for index, item in enumerate(candidates)]
        unique, duplicates = deduplicate(articles)
        accepted: list[dict[str, Any]] = []
        filtered = 0
        for article in unique:
            candidate = candidates[int(article["row_index"])]
            analysis = self._analyze(article, candidate.get("_page"))
            if analysis["decision"] == "irrelevant":
                filtered += 1
                continue
            accepted.append({
                **self._public_candidate(candidate),
                "agentAnalysis": analysis,
            })
        return accepted, {"filtered": filtered, "duplicates": len(duplicates), "agentVersion": VERSION}

    def _normalize(self, candidate: dict[str, Any], source_name: str, index: int) -> dict[str, Any]:
        return normalize_article({
            "id": str(index + 1),
            "title": candidate.get("title"),
            "url": candidate.get("originalUrl"),
            "source": source_name,
            "publish_time": candidate.get("publishedAt"),
            "summary": candidate.get("summary"),
            "content": candidate.get("content"),
        }, index)

    def _analyze(self, article: dict[str, Any], page: Any) -> dict[str, Any]:
        rules = rule_analyze(article, self.config)
        analysis = rules
        if self.provider != "none" and self.model and should_use_llm(rules, self.scope):
            try:
                analysis = llm_analyze(article, rules, self.config, self.provider, self.model, self.base_url)
                for key in ("relation_level", "relation_paths", "matched_terms", "excluded_terms", "policy_terms", "ecosystem_score_raw"):
                    analysis.setdefault(key, rules.get(key))
            except Exception as error:
                logger.warning("znt_llm_fallback provider=%s error=%s", self.provider, str(error)[:500])
                analysis = {**rules, "analysis_mode": "rules_fallback"}

        analysis.update(heat_analyze(article, page if isinstance(page, dict) else None, self.config.get("heat", {})))
        analysis["priority_score"] = min(100, int(round(analysis.get("relevance_score", 0) * 0.7 + analysis.get("heat_score", 0) * 0.3)))
        analysis["importance_score"] = min(100, analysis["priority_score"] + (5 if analysis.get("category") in ("policy", "policy_interpretation") else 0))
        analysis["agent_version"] = VERSION
        return analysis

    @staticmethod
    def _public_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in candidate.items() if not key.startswith("_")}
