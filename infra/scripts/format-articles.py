#!/usr/bin/env python3
"""Format existing plain-text articles with rule-based WeChat style."""
import re, os, json
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(
    host=os.environ.get("DB_HOST", "postgres"),
    port=os.environ.get("DB_PORT", "5432"),
    dbname=os.environ.get("DB_NAME", "opc_nexus"),
    user=os.environ.get("DB_USER", "opc"),
    password=os.environ.get("DB_PASSWORD", ""),
)
cur = conn.cursor(cursor_factory=RealDictCursor)

# Find articles with plain-text content (no HTML)
cur.execute(
    "SELECT id, title, content FROM articles "
    "WHERE content != '' "
    "AND content NOT LIKE '%<p%' "
    "AND content NOT LIKE '%<div%' "
    "ORDER BY created_at DESC LIMIT 50"
)
rows = cur.fetchall()

important_pattern = re.compile(
    r"(\d+亿|\d+万|\d+%|\d+亿元|\d+万亿|[A-Z]{2,}|"
    r"融资|上市|发布|突破|重磅|首发|独家|政策|监管|"
    r"投资|收购|合并|IPO|基金|母基金|美元|人民币)"
)

formatted_count = 0
for row in rows:
    article_id = row["id"]
    title = row["title"]
    content = row["content"]
    if not content or len(content) < 80:
        continue

    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    if not paragraphs:
        continue

    formatted_paras = []
    key_sentences = []

    for i, para in enumerate(paragraphs):
        text = para.replace("\n", "<br>")
        sentences = re.split(r"(?<=[。！？])", text)
        highlighted_parts = []
        for s in sentences:
            stripped = s.strip()
            if important_pattern.search(stripped) and 10 < len(stripped) < 200:
                highlighted_parts.append(f"<strong>{s}</strong>")
                if len(key_sentences) < 3:
                    key_sentences.append(stripped)
            else:
                highlighted_parts.append(s)
        formatted_text = "".join(highlighted_parts)

        if i == 0 and len(paragraphs) > 2:
            formatted_paras.append(
                f'<p class="article-lead">{formatted_text}</p>'
            )
        else:
            formatted_paras.append(f"<p>{formatted_text}</p>")

    html = "\n".join(formatted_paras)

    # Add key-takeaways box
    if len(key_sentences) >= 2:
        items = "".join(f"<li>{s}</li>" for s in key_sentences[:3])
        html = (
            f'<div class="key-takeaways">'
            f"<h3>📌 核心要点</h3>"
            f"<ul>{items}</ul>"
            f"</div>\n{html}"
        )

    # Update
    cur.execute(
        "UPDATE articles SET content = %s WHERE id = %s",
        (html, article_id),
    )
    formatted_count += 1
    print(f"  OK: {title[:50]}...")

conn.commit()
cur.close()
conn.close()
print(f"\nFormatted {formatted_count} articles")
