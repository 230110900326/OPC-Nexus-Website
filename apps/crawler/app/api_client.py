from __future__ import annotations

from typing import Any

import httpx


class ApiClient:
    def __init__(self, base_url: str, token: str, timeout_seconds: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(timeout=timeout_seconds, headers={"x-crawler-token": token})

    def sources(self) -> list[dict[str, Any]]:
        data = self._request("GET", "/internal/crawler/sources")
        if not isinstance(data, list):
            raise RuntimeError("crawler API returned an invalid source list")
        return [item for item in data if isinstance(item, dict)]

    def report_run(self, payload: dict[str, Any]) -> dict[str, Any]:
        data = self._request("POST", "/internal/crawler/runs", json=payload)
        return data if isinstance(data, dict) else {}

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        response = self.client.request(method, f"{self.base_url}{path}", **kwargs)
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or not payload.get("success"):
            raise RuntimeError("crawler API rejected the request")
        return payload.get("data")
