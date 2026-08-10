"""本地运维脚本（不入库）：用 >50万字符 的 base64 头像验证 DTO 长度限制已移除。"""
import json, sys, urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = "http://120.26.129.29/api"

def http(method, path, body=None, token=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", f"Bearer {token}")
    if body is not None: req.data = json.dumps(body).encode()
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {"error": {"message": e.reason}}

# 登录 admin
st, d = http("POST", "/auth/login", {"email": "admin@opc.com", "password": "Admin123!"})
token = d.get("data", {}).get("accessToken") if st in (200, 201) else None
print("admin 登录:", "OK" if token else "FAIL " + json.dumps(d.get("error"), ensure_ascii=False))

# 构造 >50万字符 的 data URI 头像（纯色 1x1 PNG 重复放大）
pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
big = pixel * 30000  # 约 480 万字符
avatar = "data:image/png;base64," + big
print("头像长度(字符):", len(avatar))

# 用超大头像更新资料
st, d = http("PATCH", "/users/me", {"avatarUrl": avatar}, token=token)
ok = st in (200, 201) and d.get("data", {}).get("avatarUrl", "")[:30] == avatar[:30]
print("超大头像更新:", "PASS" if ok else f"FAIL st={st} " + json.dumps(d.get("error"), ensure_ascii=False)[:200])

# 清理：清空头像
st, d = http("PATCH", "/users/me", {"avatarUrl": ""}, token=token)
print("清理头像:", "OK" if st in (200, 201) else f"FAIL st={st} " + json.dumps(d.get("error"), ensure_ascii=False)[:200])
print("=== 完成 ===")
