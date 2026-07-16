from app.processing import classify_content, make_summary, normalized_fingerprint

def test_fingerprint_ignores_whitespace_and_case():
    assert normalized_fingerprint("OPC  财经") == normalized_fingerprint("opc财经")

def test_classifier_prioritizes_opc_and_individual_economy_terms():
    result = classify_content("OPC 一人公司与超级个体获得创业扶持")
    assert "OPC 一人公司" in result and "超级个体" in result and "创业扶持" in result

def test_summary_is_review_only_and_within_limit():
    summary = make_summary("OPC财经关注一人公司发展。" * 30)
    assert len(summary["summary"]) <= 160
    assert summary["needs_review"] is True
