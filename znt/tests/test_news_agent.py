# -*- coding: utf-8 -*-

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "news_agent.py"
SPEC = importlib.util.spec_from_file_location("news_agent", str(MODULE_PATH))
AGENT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AGENT)
CONFIG = AGENT.load_config(None)
WEB_PATH = Path(__file__).resolve().parents[1] / "web_enrichment.py"
WEB_SPEC = importlib.util.spec_from_file_location("web_enrichment_tests", str(WEB_PATH))
WEB = importlib.util.module_from_spec(WEB_SPEC)
WEB_SPEC.loader.exec_module(WEB)


class NewsAgentTests(unittest.TestCase):
    def analyze(self, title, content="", keywords=""):
        article = AGENT.normalize_article({
            "id": 1,
            "title": title,
            "content": content,
            "keywords": keywords,
        }, 0)
        return article, AGENT.rule_analyze(article, CONFIG)

    def test_one_person_company_is_relevant(self):
        article, result = self.analyze("41岁程序员打造一人公司")
        self.assertEqual("relevant", result["decision"])
        self.assertIn("一人公司", result["matched_terms"])
        self.assertEqual("title_only", article["data_quality"])

    def test_industrial_opc_is_excluded(self):
        _, result = self.analyze("OPC UA 工业通信协议与 PLC 数据采集方案")
        self.assertEqual("irrelevant", result["decision"])
        self.assertIn("OPC UA", result["excluded_terms"])

    def test_single_shareholder_is_reviewed(self):
        _, result = self.analyze("单一股东的公司治理责任分析")
        self.assertEqual("review", result["decision"])

    def test_ai_development_is_ecosystem_relevant(self):
        _, result = self.analyze("新一代AI智能体平台正式发布")
        self.assertEqual("relevant", result["decision"])
        self.assertIn("ai_automation", [path["id"] for path in result["relation_paths"]])

    def test_completely_unrelated_news_is_excluded(self):
        _, result = self.analyze("南非最大钻石矿停产")
        self.assertEqual("irrelevant", result["decision"])
        self.assertEqual("none", result["relation_level"])

    def test_content_only_ai_signal_requires_review(self):
        _, result = self.analyze("美国PPI数据低于预期", content="侧栏推荐：人工智能与AI自媒体的新机会。")
        self.assertEqual("review", result["decision"])
        self.assertTrue(result["content_only_signal"])

    def test_weak_content_only_policy_noise_is_excluded(self):
        _, result = self.analyze("黄金价格继续震荡", content="页面底部展示其他政策资讯。")
        self.assertEqual("irrelevant", result["decision"])

    def test_load_articles_wrapper(self):
        rows, meta = AGENT.find_article_list({"total": 1, "articles": [{"title": "x"}]})
        self.assertEqual(1, len(rows))
        self.assertEqual("articles", meta["article_array_field"])

    def test_deduplicates_tracking_parameters(self):
        first = AGENT.normalize_article({"id": 1, "title": "新闻", "url": "https://example.com/a?utm_source=x"}, 0)
        second = AGENT.normalize_article({"id": 2, "title": "新闻", "url": "https://example.com/a"}, 1)
        unique, duplicates = AGENT.deduplicate([first, second])
        self.assertEqual(1, len(unique))
        self.assertEqual(1, len(duplicates))

    def test_page_parser_extracts_body_date_and_views(self):
        page = WEB.parse_page("""
        <html><head><script type="application/ld+json">
        {"@type":"NewsArticle","headline":"AI智能体政策",
         "datePublished":"2026-07-16T08:00:00+08:00","articleBody":"这是用于一人公司经营的AI智能体政策正文。",
         "interactionStatistic":{"@type":"InteractionCounter","interactionType":{"@type":"ViewAction"},"userInteractionCount":12345}}
        </script></head><body></body></html>
        """, "https://example.com/a", 200)
        self.assertIn("一人公司", page["content"])
        self.assertEqual("2026-07-16T08:00:00+08:00", page["published_time"])
        self.assertEqual(12345, page["metrics"][0]["value"])

    def test_author_total_views_are_not_article_views(self):
        page = WEB.parse_page("""
        <html><body><div>文章数7124</div><div>阅读13781.4K</div><div>关注5987</div></body></html>
        """, "https://example.com/a", 200)
        self.assertFalse(any(item["metric"] == "views" for item in page["metrics"]))

    def test_dom_classes_identify_interactions(self):
        page = WEB.parse_page("""
        <html><body><div>2026年07月15日 09:36</div>
        <div class="thumbNum normalColor">80</div>
        <b class="favorite-count item-count-common">27</b>
        <b class="comment-count item-count-common">1</b></body></html>
        """, "https://example.com/a", 200)
        values = {item["metric"]: item["value"] for item in page["metrics"]}
        self.assertEqual(80, values["likes"])
        self.assertEqual(27, values["favorites"])
        self.assertEqual(1, values["comments"])
        self.assertEqual("2026年07月15日 09:36", page["published_time"])


if __name__ == "__main__":
    unittest.main()
