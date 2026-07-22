from types import SimpleNamespace

from app.intelligence import NewsIntelligence


def settings() -> SimpleNamespace:
    return SimpleNamespace(
        intelligence_enabled=True,
        intelligence_provider="none",
        intelligence_model="",
        intelligence_base_url="",
        intelligence_llm_scope="candidates",
        intelligence_config_path="",
    )


def candidate(title: str, url: str) -> dict:
    return {
        "title": title,
        "content": "这是一段用于验证 OPC 新闻智能体接入流程的完整正文。" * 8,
        "originalUrl": url,
        "canonicalUrl": url,
        "publishedAt": "2026-07-21T08:00:00+08:00",
    }


def test_filters_irrelevant_articles_and_preserves_agent_analysis() -> None:
    agent = NewsIntelligence(settings())
    accepted, stats = agent.process([
        candidate("新一代 AI 智能体平台正式发布", "https://example.test/ai"),
        candidate("南非最大钻石矿停产", "https://example.test/mine"),
    ], "测试来源")

    assert len(accepted) == 1
    assert accepted[0]["agentAnalysis"]["decision"] == "relevant"
    assert accepted[0]["agentAnalysis"]["agent_version"] == "2.0.1"
    assert stats == {"filtered": 1, "duplicates": 0, "agentVersion": "2.0.1"}


def test_deduplicates_tracking_variants_before_ingest() -> None:
    agent = NewsIntelligence(settings())
    accepted, stats = agent.process([
        candidate("一人公司经营案例", "https://example.test/story?utm_source=test"),
        candidate("一人公司经营案例", "https://example.test/story"),
    ], "测试来源")

    assert len(accepted) == 1
    assert stats["duplicates"] == 1
