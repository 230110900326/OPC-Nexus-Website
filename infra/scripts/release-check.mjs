import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const failures = [];
const requiredFiles = [
  "apps/api/Dockerfile", "apps/web/Dockerfile", "apps/crawler/Dockerfile", "infra/docker-compose.yml",
  "infra/nginx.conf", "infra/scripts/postgres-backup.sh", "infra/scripts/production-monitor.sh",
  "apps/web/app/robots.ts", "apps/web/app/sitemap.ts", "apps/web/app/not-found.tsx",
];

for (const file of requiredFiles) if (!existsSync(resolve(root, file))) failures.push(`missing:${file}`);

const envPath = resolve(root, ".env");
if (!existsSync(envPath)) failures.push("missing:.env");
else {
  const values = Object.fromEntries(readFileSync(envPath, "utf8").split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line)).map((line) => line.split(/=(.*)/s).slice(0, 2)));
  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "POSTGRES_PASSWORD"]) {
    const value = values[key]?.trim() ?? "";
    if (value.length < 32 || /replace|change-me|password/i.test(value)) failures.push(`unsafe:${key}`);
  }
  if (values.JWT_ACCESS_SECRET && values.JWT_ACCESS_SECRET === values.JWT_REFRESH_SECRET) failures.push("unsafe:JWT secrets must differ");
}

const checks = [
  ["API typecheck", ["npm", "run", "lint", "--workspace=@opc/api"]],
  ["Web typecheck", ["npm", "run", "lint", "--workspace=@opc/web"]],
  ["API tests", ["npm", "run", "test", "--workspace=@opc/api", "--", "--runInBand"]],
  ["Production build", ["npm", "run", "build"]],
  ["Compose validation", ["docker", "compose", "--env-file", ".env", "-f", "infra/docker-compose.yml", "config", "--quiet"]],
];

for (const [label, [command, ...args]] of checks) {
  console.log(`\n[release-check] ${label}`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) failures.push(`failed:${label}`);
}

if (failures.length) {
  console.error(`\nrelease_check_failed ${failures.join(" ")}`);
  process.exit(1);
}
console.log("\nrelease_check_passed");
