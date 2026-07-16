from app.discovery import discover_feed_urls

def test_discovers_and_deduplicates_rss_atom_and_sitemap_urls():
    xml = """<feed xmlns='http://www.w3.org/2005/Atom'><entry><link href='https://local.test/a'/></entry><entry><link href='https://local.test/a'/></entry><urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'><url><loc>https://local.test/b</loc></url></urlset></feed>"""
    assert discover_feed_urls(xml) == ["https://local.test/a", "https://local.test/b"]
