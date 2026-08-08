"""Headless-browser adapter for JS-rendered video search pages (Tencent/Douyin)."""
from __future__ import annotations

import logging
from typing import Callable

logger = logging.getLogger(__name__)


class BrowserSearcher:
    """Lazily-launched Chromium for rendering JS-heavy search pages.

    用法：在 CrawlRunner 中共享一个实例（启动一次、复用），用完关闭。
    """

    def __init__(self) -> None:
        self._playwright = None
        self._browser = None

    @property
    def available(self) -> bool:
        try:
            from playwright.sync_api import sync_playwright  # noqa: F401
            return True
        except Exception:
            return False

    def _ensure(self):
        if self._browser is not None:
            return
        from playwright.sync_api import sync_playwright
        logger.info("browser_launching chromium headless")
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
        )
        logger.info("browser_launched")

    def search(self, url: str, extract_fn: Callable[[str], list[str]], wait_selector: str | None = None,
               timeout: int = 20000, settle_ms: int = 2500) -> list[str]:
        """打开 url，等待 JS 渲染后把页面 HTML 交给 extract_fn，返回提取结果。"""
        try:
            self._ensure()
        except Exception as exc:
            logger.warning("browser_launch_failed: %s", str(exc)[:200])
            return []
        page = None
        try:
            page = self._browser.new_page()
            page.goto(url, timeout=timeout, wait_until="domcontentloaded")
            if wait_selector:
                try:
                    page.wait_for_selector(wait_selector, timeout=timeout)
                except Exception:
                    pass
            page.wait_for_timeout(settle_ms)  # 等 JS 完成渲染
            html = page.content()
            return extract_fn(html)
        except Exception as exc:
            logger.warning("browser_search_failed url=%s err=%s", url[:80], str(exc)[:150])
            return []
        finally:
            if page is not None:
                try:
                    page.close()
                except Exception:
                    pass

    def close(self) -> None:
        if self._browser is not None:
            try:
                self._browser.close()
            except Exception:
                pass
        if self._playwright is not None:
            try:
                self._playwright.stop()
            except Exception:
                pass
        self._browser = None
        self._playwright = None
        logger.info("browser_closed")
