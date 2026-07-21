from types import SimpleNamespace

from app.runtime import CrawlRunner


class FakeApi:
    def __init__(self) -> None:
        self.payloads: list[dict] = []

    def sources(self) -> list[dict]:
        return []

    def report_run(self, payload: dict) -> dict:
        self.payloads.append(payload)
        return {"jobId": "job-1"}


def settings() -> SimpleNamespace:
    return SimpleNamespace(request_timeout_seconds=1, user_agent="test", max_items_per_source=10)


def test_html_discovery_skips_the_index_page_when_article_links_exist() -> None:
    runner = CrawlRunner(settings(), FakeApi())
    runner._fetch = lambda _url, _domain: ("<a href='/article-a'>A</a><a href='/article-b'>B</a>", "https://news.example.test/index")  # type: ignore[method-assign]
    assert runner._discover_urls("https://news.example.test/index", "news.example.test", "html") == ["https://news.example.test/article-a", "https://news.example.test/article-b"]


def test_runner_reports_failed_sources_without_importing_content() -> None:
    api = FakeApi()
    runner = CrawlRunner(settings(), api)
    runner._fetch = lambda _url, _domain: (_ for _ in ()).throw(ValueError("blocked"))  # type: ignore[method-assign]
    runner._run_source({"id": "source-1", "domain": "news.example.test", "entryUrl": "https://news.example.test/feed", "fetchMethod": "rss", "type": "news"})
    assert api.payloads[0]["errorMessage"] == "blocked"
    assert api.payloads[0]["articles"] == []
