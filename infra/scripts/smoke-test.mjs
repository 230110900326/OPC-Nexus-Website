const baseUrl = (process.argv[2] || process.env.BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const checks = [
  ["gateway", "/healthz", "text"],
  ["homepage", "/", "html"],
  ["login", "/auth", "html"],
  ["news", "/news", "html"],
  ["videos", "/videos", "html"],
  ["community", "/community", "html"],
  ["events", "/events", "html"],
  ["disclaimer", "/disclaimer", "html"],
  ["robots", "/robots.txt", "text"],
  ["sitemap", "/sitemap.xml", "xml"],
  ["api", "/api/health/ready", "json"],
];

const failures = [];
for (const [name, path, kind] of checks) {
  try {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    const contentType = response.headers.get("content-type") ?? "";
    const validType = kind === "html" ? contentType.includes("text/html") : kind === "json" ? contentType.includes("application/json") : kind === "xml" ? contentType.includes("xml") : true;
    if (!response.ok || !validType) failures.push(`${name}:${response.status}:${contentType}`);
    else console.log(`smoke_ok name=${name} status=${response.status}`);
  } catch (reason) {
    failures.push(`${name}:${reason instanceof Error ? reason.message : "request_failed"}`);
  }
}

if (failures.length) {
  console.error(`smoke_failed ${failures.join(" ")}`);
  process.exit(1);
}
console.log(`smoke_passed base_url=${baseUrl}`);
