from app.parser import is_allowed_url, parse_article

SAMPLE = """<html><head><title>普通标题</title><link rel='canonical' href='/policy/1'/><meta property='og:title' content='OPC 一人公司政策利好'/><meta name='author' content='OPC财经'/><meta property='article:published_time' content='2026-07-16'/><meta property='og:image' content='/cover.png'/></head><body><nav>导航</nav><article>支持一人公司和超级个体发展。</article><script>ignore</script></body></html>"""

def test_parse_article_extracts_metadata_and_ignores_navigation():
    article = parse_article(SAMPLE, "http://127.0.0.1:8099/page")
    assert article.title == "OPC 一人公司政策利好"
    assert article.canonical_url == "http://127.0.0.1:8099/policy/1"
    assert article.image_url == "http://127.0.0.1:8099/cover.png"
    assert "支持一人公司" in article.body and "导航" not in article.body

def test_only_allowlisted_domains_can_be_requested():
    assert is_allowed_url("http://127.0.0.1:8099/article.html", {"127.0.0.1", "localhost"})
    assert not is_allowed_url("https://example.com/article", {"127.0.0.1", "localhost"})
