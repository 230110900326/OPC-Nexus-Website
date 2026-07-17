import { readFile } from "node:fs/promises";
import path from "node:path";

const legalDocumentHeaders = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
  "Content-Type": "text/html; charset=utf-8",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function readLegalSource(filename: string) {
  const candidates = [
    path.join(process.cwd(), "public", "legal", filename),
    path.join(process.cwd(), "apps", "web", "public", "legal", filename),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch (reason) {
      const code = reason && typeof reason === "object" && "code" in reason ? reason.code : undefined;
      if (code !== "ENOENT") throw reason;
    }
  }

  return "";
}

function documentShell(title: string, body: string) {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} | OPC Nexus</title>
  <style>
    :root { color-scheme:light; --ink:#0b1d2c; --soft:#294457; --paper:#f6f4ef; --copper:#b56a3b; --line:rgba(11,29,44,.16); }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font:15px/1.85 Arial,"Microsoft YaHei",sans-serif; }
    header { display:flex; align-items:center; justify-content:space-between; width:min(920px,calc(100% - 40px)); min-height:76px; margin:auto; border-bottom:1px solid var(--line); }
    header a { color:inherit; text-decoration:none; }
    header a:first-child { font-size:13px; font-weight:800; letter-spacing:.14em; }
    header a:last-child { color:var(--soft); font-size:12px; }
    main { width:min(820px,calc(100% - 40px)); margin:clamp(48px,8vw,92px) auto 100px; }
    article { padding:clamp(28px,5vw,58px); background:#fff; box-shadow:0 2px 18px rgba(11,29,44,.07); }
    h1 { margin:0 0 38px; font:500 clamp(38px,7vw,64px)/1.08 Georgia,"Noto Serif SC",serif; letter-spacing:-.05em; }
    h2 { margin:42px 0 12px; font:500 25px/1.35 Georgia,"Noto Serif SC",serif; }
    h3 { margin:30px 0 8px; font-size:17px; }
    p,li,dd { color:var(--soft); }
    a { color:var(--copper); }
    ul,ol { padding-left:1.35em; }
    table { width:100%; border-collapse:collapse; }
    th,td { padding:10px; border:1px solid var(--line); text-align:left; vertical-align:top; }
    .legal-empty { padding:clamp(32px,6vw,64px); border-top:3px solid var(--copper); background:#fff; }
    .legal-empty small { color:var(--copper); font-weight:700; letter-spacing:.14em; }
    .legal-empty h1 { margin:18px 0; }
    @media (max-width:600px) { body { font-size:14px; } article { padding:26px 20px; } }
  </style>
</head>
<body>
  <header><a href="/">OPC NEXUS</a><a href="/auth">返回登录 / 注册</a></header>
  <main>${body}</main>
</body>
</html>`;
}

export async function legalDocumentResponse(filename: string, title: string) {
  const source = (await readLegalSource(filename)).trim();
  if (!source) {
    const body = `<section class="legal-empty" role="status"><small>LEGAL DOCUMENT</small><h1>${escapeHtml(title)}</h1><p>协议正文正在整理中，请稍后再试。</p><p><a href="/auth">返回登录 / 注册</a></p></section>`;
    return new Response(documentShell(title, body), { headers: legalDocumentHeaders });
  }

  if (/<!doctype\s+html|<html[\s>]/i.test(source)) {
    return new Response(source, { headers: legalDocumentHeaders });
  }

  const heading = /<h1[\s>]/i.test(source) ? "" : `<h1>${escapeHtml(title)}</h1>`;
  return new Response(documentShell(title, `<article>${heading}${source}</article>`), { headers: legalDocumentHeaders });
}
