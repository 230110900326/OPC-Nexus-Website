"""本地运维脚本（不入库）：生产互动功能端到端验证（点赞/收藏/评论 + 三个"我的"接口）。
用 admin 账号操作，结束后用 SQL 硬删测试数据，保持生产库干净。"""
import json, re, ssl, sys, urllib.request, uuid
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = "http://120.26.129.29/api"
HOST, USER, PWD = "120.26.129.29", "root", "QWqw15990116680"

results = []
def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS  " if ok else "FAIL  ") + name + (f"  ——  {detail}" if detail else ""))

def http(method, path, body=None, token=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", f"Bearer {token}")
    if body is not None: req.data = json.dumps(body).encode()
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {"error": {"message": e.reason}}

# ── 1. 登录 admin ──
st, data = http("POST", "/auth/login", {"email": "admin@opc.com", "password": "Admin123!"})
token = data.get("data", {}).get("accessToken") if st == 201 or st == 200 else None
check("admin 登录", bool(token), data.get("error", {}).get("message", "") if not token else data["data"]["user"]["displayName"])

# ── 2. 取一篇已发布文章 + 一条已发布视频 ──
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PWD, timeout=20, look_for_keys=False, allow_agent=False)
def psql(q):
    _, o, e = c.exec_command(f'docker exec opc-nexus-postgres-1 psql -U opc -d opc_nexus -t -A -c "{q}"', timeout=30)
    return o.read().decode().strip() or e.read().decode().strip()
article_id = psql("SELECT id FROM articles WHERE status='published' ORDER BY published_at DESC LIMIT 1;")
video_id = psql("SELECT id FROM videos WHERE is_published=true ORDER BY published_at DESC LIMIT 1;")
check("取到文章ID", bool(article_id and article_id != "0"), article_id)
check("取到视频ID", bool(video_id and video_id != "0"), video_id)

test_marker = "QA功能验证·端到端评论测试"
created_comment_ids = []

if token and article_id and video_id:
    # ── 3. 文章点赞 + 收藏 ──
    st, d = http("POST", f"/interactions/likes/article/{article_id}", token=token)
    check("文章点赞", st in (200, 201) and d.get("data", {}).get("active"), json.dumps(d.get("data", {}), ensure_ascii=False))
    st, d = http("POST", f"/interactions/favorites/article/{article_id}", token=token)
    check("文章收藏", st in (200, 201) and d.get("data", {}).get("active"), json.dumps(d.get("data", {}), ensure_ascii=False))
    # ── 4. 文章 state（登录态）──
    st, d = http("GET", f"/interactions/state/article/{article_id}", token=token)
    stt = d.get("data", {})
    check("文章 state isLiked", st == 200 and stt.get("isLiked"), json.dumps(stt, ensure_ascii=False))
    check("文章 state isFavorited", stt.get("isFavorited"), json.dumps(stt, ensure_ascii=False))
    # ── 5. 文章评论 ──
    st, d = http("POST", f"/content/comments/article/{article_id}", {"body": test_marker}, token=token)
    cmt = d.get("data", {})
    check("文章发评论", st in (200, 201) and cmt.get("id"), json.dumps(cmt, ensure_ascii=False))
    if cmt.get("id"): created_comment_ids.append(cmt["id"])
    # ── 6. 评论列表 ──
    st, d = http("GET", f"/content/comments/article/{article_id}")
    lst = d.get("data", {})
    check("文章评论列表", st == 200 and lst.get("count", 0) >= 1, f"count={lst.get('count')}")
    # ── 7. 视频点赞/收藏/评论 ──
    st, d = http("POST", f"/interactions/likes/video/{video_id}", token=token)
    check("视频点赞", st in (200, 201) and d.get("data", {}).get("active"), json.dumps(d.get("data", {}), ensure_ascii=False))
    st, d = http("POST", f"/interactions/favorites/video/{video_id}", token=token)
    check("视频收藏", st in (200, 201) and d.get("data", {}).get("active"), json.dumps(d.get("data", {}), ensure_ascii=False))
    st, d = http("POST", f"/content/comments/video/{video_id}", {"body": test_marker}, token=token)
    cmt = d.get("data", {})
    check("视频发评论", st in (200, 201) and cmt.get("id"), json.dumps(cmt, ensure_ascii=False))
    if cmt.get("id"): created_comment_ids.append(cmt["id"])
    # ── 8. 视频 state ──
    st, d = http("GET", f"/interactions/state/video/{video_id}", token=token)
    stt = d.get("data", {})
    check("视频 state", st == 200 and stt.get("isLiked") and stt.get("isFavorited"), json.dumps(stt, ensure_ascii=False))
    # ── 9. 三个"我的"接口 ──
    st, d = http("GET", "/interactions/me/favorites", token=token)
    fav = d.get("data", [])
    check("我的收藏含文章+视频", st == 200 and any(i.get("target", {}).get("targetType") == "article" for i in fav) and any(i.get("target", {}).get("targetType") == "video" for i in fav), f"{len(fav)}条")
    st, d = http("GET", "/interactions/me/likes", token=token)
    lik = d.get("data", [])
    check("我的点赞含文章+视频", st == 200 and any(i.get("target", {}).get("targetType") == "article" for i in lik) and any(i.get("target", {}).get("targetType") == "video" for i in lik), f"{len(lik)}条")
    st, d = http("GET", "/interactions/me/comments", token=token)
    mycm = d.get("data", [])
    check("我的评论含测试评论", st == 200 and any(i.get("body") == test_marker for i in mycm), f"{len(mycm)}条")
    # ── 10. 视频详情接口仍正常（供前端渲染）──
    st, d = http("GET", f"/videos/{video_id}")
    check("视频详情接口 200", st == 200 and d.get("success"), "")

    # ── 清理：硬删测试数据（admin 的点赞/收藏/评论）──
    ids = ", ".join(f"'{cid}'" for cid in created_comment_ids) or "''"
    print("=== 清理测试数据 ===")
    print(psql(f"DELETE FROM likes WHERE user_id=(SELECT id FROM users WHERE email='admin@opc.com') AND target_id IN ('{article_id}','{video_id}');"))
    print(psql(f"DELETE FROM favorites WHERE user_id=(SELECT id FROM users WHERE email='admin@opc.com') AND target_id IN ('{article_id}','{video_id}');"))
    print(psql(f"DELETE FROM comments WHERE id IN ({ids});"))
    print(psql(f"DELETE FROM reports WHERE target_type='comment' AND target_id IN ({ids});"))
    print("=== 清理后计数 ===")
    print("likes:", psql(f"SELECT count(*) FROM likes WHERE user_id=(SELECT id FROM users WHERE email='admin@opc.com') AND target_id IN ('{article_id}','{video_id}');"))
    print("favorites:", psql(f"SELECT count(*) FROM favorites WHERE user_id=(SELECT id FROM users WHERE email='admin@opc.com') AND target_id IN ('{article_id}','{video_id}');"))
    print("comments:", psql(f"SELECT count(*) FROM comments WHERE id IN ({ids});"))

c.close()
fails = [r for r in results if not r[1]]
print("\n===== 汇总：", f"{len(results)-len(fails)}/{len(results)} 通过", "=====")
if fails:
    print("失败项：", [r[0] for r in fails])
    sys.exit(1)
