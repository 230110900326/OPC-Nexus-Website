/* 一次性回填脚本：把现有长文（content > 800字 且 original_content 为空）用 LLM 精简为 ~800 字浓缩版。
   保留原文到 original_content。与爬取入库时的精简逻辑共用 CONTENT_CONDENSE_* 配置。
   用法（api 容器内，dist 已编译）：
     node dist/scripts/backfill-condense.js
   依赖：DB_* 与 CONTENT_CONDENSE_* 环境变量（docker-compose 已注入 .env）。 */
import { DataSource } from "typeorm";
import { Article, ArticleStatus } from "../database/entities/article.entity";

async function condense(title: string, content: string, baseUrl: string, model: string, apiKey: string): Promise<string | null> {
  const plainLen = content.replace(/<[^>]+>/g, "").length;
  if (plainLen <= 800) return null;
  const maxInput = 8000;
  const truncated = content.length > maxInput ? content.slice(0, maxInput) + "\n\n[内容过长已截断]" : content;
  const prompt = `你是一位资深的财经新闻编辑。请把下面的文章精简为约 800 字的浓缩版，要求：
1. 完整保留原文的核心信息与关键事实（数字、金额、机构名称、政策要点、最终结论），不能遗漏重要内容，也不能虚构或编造任何信息
2. 去掉冗余铺垫、重复表述、口水话与营销用语
3. 保持客观中立的新闻报道语气，若原文是政策解读需突出政策要点与影响
4. 只输出纯文本，段落之间用空行分隔，不要输出任何 Markdown、HTML 标签或解释文字

文章标题：${title}

文章正文：
${truncated}

请输出精简后的纯文本：`;
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "你是一名严谨的财经新闻编辑，擅长在保留原文含义的前提下提炼浓缩版文章，绝不虚构事实。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => "");
      console.error(`  API ${response.status}: ${err.slice(0, 200)}`);
      return null;
    }
    const data = await response.json() as any;
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (error: any) {
    console.error(`  condense error: ${error?.message || error}`);
    return null;
  }
}

async function main() {
  if (process.env.CONTENT_CONDENSE_ENABLED !== "true" || !process.env.CONTENT_CONDENSE_API_KEY) {
    console.error("CONTENT_CONDENSE_ENABLED=true 且 CONTENT_CONDENSE_API_KEY 必须设置");
    process.exit(1);
  }
  const model = process.env.CONTENT_CONDENSE_MODEL || "deepseek-chat";
  const baseUrl = process.env.CONTENT_CONDENSE_BASE_URL || "https://api.deepseek.com/v1";

  const ds = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Article],
    synchronize: false,
  });
  await ds.initialize();
  const repo = ds.getRepository(Article);
  const rows = await repo.createQueryBuilder("a")
    .where("length(a.content) > 900 AND a.original_content IS NULL AND a.status IN (:...statuses)", { statuses: [ArticleStatus.PUBLISHED, ArticleStatus.REVIEW] })
    .orderBy("a.created_at", "ASC")
    .getMany();
  console.log(`found ${rows.length} long articles to condense`);
  let ok = 0, fail = 0, skip = 0;
  for (const a of rows) {
    if (a.content.replace(/<[^>]+>/g, "").length <= 800) { skip++; continue; }
    const text = await condense(a.title, a.content, baseUrl, model, process.env.CONTENT_CONDENSE_API_KEY as string);
    if (text && text.length > 0) {
      await repo.update(a.id, { content: text, originalContent: a.content });
      ok++;
      console.log(`OK   ${a.id.slice(0, 8)} ${a.title.slice(0, 24)} -> ${text.length} 字`);
    } else {
      fail++;
      console.log(`FAIL ${a.id.slice(0, 8)} ${a.title.slice(0, 24)}`);
    }
  }
  console.log(`done: ${ok} ok, ${fail} fail, ${skip} skipped`);
  await ds.destroy();
}

main().catch((error) => { console.error(error); process.exit(1); });
