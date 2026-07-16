from app.policy_adapter import parse_policy_sample

def test_policy_adapter_extracts_required_policy_fields():
    html = """<html><head><title>支持个体创业的若干措施</title></head><body>发文机关：OPC示例局 文号：OPC〔2026〕1号 发布日期：2026-07-16</body></html>"""
    policy = parse_policy_sample(html, "http://127.0.0.1:8099/policy")
    assert policy.title == "支持个体创业的若干措施"
    assert policy.issuing_authority == "OPC示例局"
    assert policy.document_number == "OPC〔2026〕1号"
    assert policy.published_at == "2026-07-16"
