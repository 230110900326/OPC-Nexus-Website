#!/usr/bin/env python3
"""Backfill missing Bilibili video covers from the public Bilibili API.

The command is intentionally dry-run by default.  It only writes rows when
``--apply`` is supplied, and every update re-checks that the cover is still
empty so it is safe to retry while the application is running.

Examples (from the repository root)::

    python infra/scripts/backfill-bilibili-covers.py
    python infra/scripts/backfill-bilibili-covers.py --apply

The script talks to PostgreSQL through the existing postgres container rather
than reading database credentials from the host environment.  It never prints
secrets or response bodies.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen


DEFAULT_CONTAINER = "opc-nexus-postgres-1"
DEFAULT_DB = "opc_nexus"
DEFAULT_DB_USER = "opc"
DEFAULT_CHECKPOINT = ".codex-tmp/bilibili-cover-backfill.json"
USER_AGENT = "OPC-Nexus-cover-backfill/1.0 (+https://wangdada.site)"
BVID_RE = re.compile(r"(?i)(BV[0-9A-Za-z]{10})")
AID_RE = re.compile(r"(?i)(?:^|[^0-9])av([0-9]+)(?:$|[^0-9])")
COVER_HOST_RE = re.compile(r"^i[0-9]+\.hdslb\.com$", re.IGNORECASE)
COVER_PATH_RE = re.compile(r"^/bfs/archive/[A-Za-z0-9._/-]+(?:\.[A-Za-z0-9]+)?$", re.IGNORECASE)


@dataclass(frozen=True)
class VideoRow:
    id: str
    platform: str
    platform_video_id: str
    original_url: str


@dataclass(frozen=True)
class CoverResult:
    row_id: str
    status: str
    cover_url: str | None = None
    bvid: str | None = None
    error: str | None = None


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def run_psql(
    args: argparse.Namespace,
    sql: str | None,
    *,
    stdin: str | None = None,
    tuples_only: bool = False,
) -> str:
    command = [
        "docker",
        "exec",
        "-i",
        args.container,
        "psql",
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        args.db_user,
        "-d",
        args.db_name,
    ]
    if tuples_only:
        command.extend(["-A", "-t", "-F", "\t"])
    if sql is not None:
        command.extend(["-c", sql])
    completed = subprocess.run(
        command,
        input=stdin,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip() or "psql failed"
        raise RuntimeError(detail)
    return completed.stdout


def fetch_rows(args: argparse.Namespace) -> list[VideoRow]:
    query = """
      SELECT json_build_object(
        'id', id,
        'platform', platform,
        'platform_video_id', platform_video_id,
        'original_url', original_url
      )::text
      FROM videos
      WHERE (cover_url IS NULL OR btrim(cover_url) = '')
        AND platform = 'bilibili'
      ORDER BY created_at ASC, id ASC
    """
    output = run_psql(args, query, tuples_only=True)
    rows: list[VideoRow] = []
    for line in output.splitlines():
        if not line.strip():
            continue
        value = json.loads(line)
        rows.append(
            VideoRow(
                id=str(value["id"]),
                platform=str(value["platform"]),
                platform_video_id=str(value["platform_video_id"] or ""),
                original_url=str(value["original_url"] or ""),
            )
        )
    return rows


def extract_video_ref(row: VideoRow) -> tuple[str, str] | None:
    """Return (kind, id) for a BVID or AID found in the row."""
    for value in (row.platform_video_id, row.original_url):
        match = BVID_RE.search(value)
        if match:
            return "bvid", match.group(1)
    for value in (row.platform_video_id, row.original_url):
        match = AID_RE.search(value)
        if match:
            return "aid", match.group(1)
    return None


def normalize_cover(raw: Any) -> str:
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("Bilibili response has no cover URL")
    parsed = urlsplit(raw.strip())
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("cover URL uses an unexpected scheme")
    if not COVER_HOST_RE.fullmatch(parsed.hostname or ""):
        raise ValueError("cover URL is not an official Bilibili image host")
    if not COVER_PATH_RE.fullmatch(parsed.path):
        raise ValueError("cover URL is not an archive image path")
    # Keep only ordinary image-processing parameters returned by Bilibili;
    # dropping fragments prevents them from being sent to the proxy.
    query = urlencode(
        [(key, value) for key, value in parse_qsl(parsed.query, keep_blank_values=True) if len(key) <= 40 and len(value) <= 400]
    )
    return urlunsplit(("https", parsed.netloc.lower(), parsed.path, query, ""))


def request_json(url: str, timeout: float) -> dict[str, Any]:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Referer": "https://www.bilibili.com/"})
    with urlopen(request, timeout=timeout) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}")
        payload = response.read(2_000_000)
    value = json.loads(payload.decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError("Bilibili response is not an object")
    return value


def verify_image(url: str, timeout: float) -> None:
    """Check that the source currently serves an image without downloading it fully."""
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Referer": "https://www.bilibili.com/",
            "Range": "bytes=0-2047",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        content_type = (response.headers.get("Content-Type") or "").lower()
        if not content_type.startswith("image/"):
            raise ValueError(f"source content type is {content_type or 'unknown'}")
        response.read(2048)


def fetch_cover(args: argparse.Namespace, row: VideoRow) -> CoverResult:
    reference = extract_video_ref(row)
    if reference is None:
        return CoverResult(row.id, "skipped", error="no BVID/AID in database row")
    kind, value = reference
    parameter = "bvid" if kind == "bvid" else "aid"
    endpoint = f"https://api.bilibili.com/x/web-interface/view?{parameter}={value}"
    last_error = "unknown error"
    for attempt in range(args.retries + 1):
        try:
            payload = request_json(endpoint, args.timeout)
            code = payload.get("code")
            if code != 0:
                raise RuntimeError(f"Bilibili API code {code}")
            data = payload.get("data")
            if not isinstance(data, dict):
                raise ValueError("Bilibili response has no data")
            cover = normalize_cover(data.get("pic"))
            if args.verify_images:
                verify_image(cover, args.timeout)
            return CoverResult(row.id, "ready", cover_url=cover, bvid=str(data.get("bvid") or value))
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
            last_error = str(error)[:240]
            if attempt < args.retries:
                time.sleep(args.backoff * (2**attempt))
    return CoverResult(row.id, "failed", bvid=value if kind == "bvid" else None, error=last_error)


def load_checkpoint(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "updatedAt": None, "results": {}}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"version": 1, "updatedAt": None, "results": {}}
    if not isinstance(value, dict) or not isinstance(value.get("results"), dict):
        return {"version": 1, "updatedAt": None, "results": {}}
    return value


def save_checkpoint(path: Path, checkpoint: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(checkpoint, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def apply_results(args: argparse.Namespace, results: Iterable[CoverResult]) -> int:
    ready = [item for item in results if item.status == "ready" and item.cover_url]
    if not ready:
        return 0
    statements = ["BEGIN;"]
    for item in ready:
        statements.append(
            "UPDATE videos SET cover_url = {cover}, updated_at = now() "
            "WHERE id = {id} AND (cover_url IS NULL OR btrim(cover_url) = '');".format(
                cover=sql_literal(item.cover_url or ""), id=sql_literal(item.row_id)
            )
        )
    statements.append("COMMIT;")
    run_psql(args, None, stdin="\n".join(statements) + "\n")
    return len(ready)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write verified covers to the database")
    parser.add_argument("--container", default=os.environ.get("POSTGRES_CONTAINER", DEFAULT_CONTAINER))
    parser.add_argument("--db-name", default=os.environ.get("POSTGRES_DB", DEFAULT_DB))
    parser.add_argument("--db-user", default=os.environ.get("POSTGRES_USER", DEFAULT_DB_USER))
    parser.add_argument("--checkpoint", default=DEFAULT_CHECKPOINT, help="JSON checkpoint path")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--backoff", type=float, default=0.8)
    parser.add_argument("--no-image-check", dest="verify_images", action="store_false", help="skip source image verification")
    parser.set_defaults(verify_images=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.workers < 1 or args.retries < 0 or args.timeout <= 0:
        raise SystemExit("workers/retries/timeout 参数无效")
    checkpoint_path = Path(args.checkpoint)
    checkpoint = load_checkpoint(checkpoint_path)
    rows = fetch_rows(args)
    print(f"待处理空封面视频：{len(rows)} 条")
    if not rows:
        print("没有需要回填的记录。")
        return 0

    results: list[CoverResult] = []
    cached = checkpoint.setdefault("results", {})
    pending: list[VideoRow] = []
    for row in rows:
        prior = cached.get(row.id)
        if isinstance(prior, dict) and prior.get("status") == "ready" and prior.get("coverUrl"):
            results.append(CoverResult(row.id, "ready", cover_url=str(prior["coverUrl"]), bvid=prior.get("bvid")))
        else:
            pending.append(row)

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(fetch_cover, args, row): row for row in pending}
        for index, future in enumerate(concurrent.futures.as_completed(futures), start=1):
            result = future.result()
            results.append(result)
            cached[result.row_id] = {
                "status": result.status,
                "coverUrl": result.cover_url,
                "bvid": result.bvid,
                "error": result.error,
                "checkedAt": utc_now(),
            }
            checkpoint["updatedAt"] = utc_now()
            save_checkpoint(checkpoint_path, checkpoint)
            if index % 25 == 0 or index == len(futures):
                print(f"接口检查进度：{index}/{len(futures)}")

    ready = [item for item in results if item.status == "ready"]
    failed = [item for item in results if item.status == "failed"]
    skipped = [item for item in results if item.status == "skipped"]
    print(f"可用真实封面：{len(ready)} 条；失败：{len(failed)} 条；跳过：{len(skipped)} 条")
    if failed:
        for item in failed[:10]:
            print(f"失败 {item.row_id}: {item.error}")
        if len(failed) > 10:
            print(f"其余失败记录已写入 {checkpoint_path}")

    if args.apply:
        updated = apply_results(args, results)
        print(f"已写入数据库：{updated} 条（仅更新仍为空的封面字段）")
    else:
        print("当前为预演模式，数据库未写入；确认结果后加 --apply 执行回填。")
    return 0 if not failed else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("已中断；下次运行会从 checkpoint 继续。", file=sys.stderr)
        raise SystemExit(130)
