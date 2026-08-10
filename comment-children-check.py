"""本地运维脚本（不入库）：验证评论节点 children 修复已上线。"""
import json, sys, urllib.request
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = "http://120.26.129.29/api"

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

# 健康检查
st, d = http("GET", "/health/ready")
print("健康检查:", st, d if isinstance(d, dict) and "error" in d else "OK")

# 登录 admin
st, d = http("POST", "/auth/login", {"email": "admin@opc.com", "password": "Admin123!"})
token = d.get("data", {}).get("accessToken") if st in (200, 201) else None
print("admin 登录:", "OK" if token else "FAIL " + json.dumps(d.get("error"), ensure_ascii=False))

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("120.26.129.29", username="root", password="QWqw15990116680", timeout=20, look_for_keys=False, allow_agent=False)
def psql(q):
    _, o, e = c.exec_command(f'docker exec opc-nexus-postgres-1 psql -U opc -d opc_nexus -t -A -c "{q}"', timeout=30)
    return o.read().decode().strip() or e.read().decode().strip()

article_id = psql("SELECT id FROM articles WHERE status='published' ORDER BY published_at DESC LIMIT 1;")
marker = "QA-children-check"
st, d = http("POST", f"/content/comments/article/{article_id}", {"body": marker}, token=token)
cmt = d.get("data", {})
cid = cmt.get("id", "")
print("发评论:", "OK" if cid else "FAIL")
st, d = http("GET", f"/content/comments/article/{article_id}")
comments = d.get("data", {}).get("comments", [])
root = next((x for x in comments if x.get("id") == cid), None)
print("children 存在且为数组:", "PASS" if root is not None and isinstance(root.get("children"), list) else f"FAIL root={root}")
# 回复一条，验证嵌套
st, d = http("POST", f"/content/comments/article/{article_id}", {"body": marker + "-reply", "parentId": cid}, token=token)
print("回复评论:", "OK" if d.get("data", {}).get("id") else "FAIL " + json.dumps(d.get("error"), ensure_ascii=False))
st, d = http("GET", f"/content/comments/article/{article_id}")
comments = d.get("data", {}).get("comments", [])
root = next((x for x in comments if x.get("id") == cid), None)
print("回复挂到 children:", "PASS" if root and root.get("children") and root["children"][0].get("id") else f"FAIL {json.dumps(root, ensure_ascii=False)[:200]}")

# 清理
ids = [cid]
reply = None
st, d = http("GET", f"/content/comments/article/{article_id}")
for x in d.get("data", {}).get("comments", []):
    if x.get("id") != cid and x.get("body", "").startswith(marker):
        ids.append(x["id"])
idlist = ", ".join(f"'{i}'" for i in ids)
print("清理:", psql(f"DELETE FROM comments WHERE id IN ({idlist});"), psql(f"DELETE FROM reports WHERE target_type='comment' AND target_id IN ({idlist});"))
c.close()
print("=== 完成 ===")
