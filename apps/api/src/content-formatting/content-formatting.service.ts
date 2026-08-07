import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface FormatResult {
  html: string;
  takeaways: string[];
  model: string;
}

@Injectable()
export class ContentFormattingService {
  private readonly logger = new Logger(ContentFormattingService.name);

  constructor(private readonly config: ConfigService) {}

  async formatArticle(title: string, content: string): Promise<FormatResult | null> {
    const enabled = this.config.get<string>("CONTENT_FORMAT_ENABLED", "false") === "true";
    if (!enabled) {
      this.logger.log("Content formatting disabled — set CONTENT_FORMAT_ENABLED=true");
      return null;
    }

    const provider = this.config.get<string>("CONTENT_FORMAT_PROVIDER", "openai");
    const model = this.config.get<string>("CONTENT_FORMAT_MODEL", "gpt-4o-mini");
    const baseUrl = this.config.get<string>("CONTENT_FORMAT_BASE_URL", "https://api.openai.com/v1");
    const apiKey = this.config.get<string>("CONTENT_FORMAT_API_KEY", "");

    if (!apiKey) {
      this.logger.warn("CONTENT_FORMAT_API_KEY not set — skipping formatting");
      return null;
    }

    // Truncate very long content to avoid token limits
    const maxChars = 8000;
    const truncated = content.length > maxChars
      ? content.slice(0, maxChars) + "\n\n[内容已截断...]"
      : content;

    const prompt = `你是一个专业的内容编辑，擅长微信公众号排版。请对以下文章进行排版优化，返回格式化的 HTML。

**要求：**
1. 用一个 <div class="key-takeaways"> 包含 2-3 条 **核心要点**（用 <ul><li> 列表）
2. 正文中最重要的句子用 <strong> 加粗突出（每段 1-2 句）
3. 用 <span class="article-highlight"> 标记最关键的段落
4. 段落间保持原文逻辑顺序，不要改变原文内容
5. 只输出 HTML 片段（从 <div class="key-takeaways"> 开始），不要输出任何解释

**文章标题：** ${title}

**文章正文：**
${truncated}

**请输出格式化的 HTML：**`;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "你是一个专业的微信公众号内容排版编辑，擅长提取文章重点并进行视觉排版。只输出 HTML 片段，不输出任何解释。" },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        this.logger.error(`LLM API error ${response.status}: ${errBody.slice(0, 300)}`);
        return null;
      }

      const data = await response.json() as any;
      const raw = data?.choices?.[0]?.message?.content?.trim();
      if (!raw) {
        this.logger.warn("LLM returned empty response");
        return null;
      }

      // Extract HTML between the first < and last >
      const htmlMatch = raw.match(/<[\s\S]*>/);
      const html = htmlMatch ? htmlMatch[0] : raw;

      // Extract takeaways text for metadata
      const takeawayMatches = html.match(/<li>(.*?)<\/li>/g);
      const takeaways = takeawayMatches
        ? takeawayMatches.map((li: string) => li.replace(/<\/?li>/g, "").replace(/<[^>]+>/g, "").trim()).filter(Boolean).slice(0, 3)
        : [];

      this.logger.log(`Formatted article "${title.slice(0, 40)}..." with model ${model}`);
      return { html, takeaways, model };
    } catch (error: any) {
      this.logger.error(`Formatting failed: ${error?.message || error}`);
      return null;
    }
  }

  /** Simple rule-based formatting fallback when AI is not available */
  formatArticleRuleBased(content: string): string {
    if (!content) return "";

    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());
    if (paragraphs.length === 0) return `<p>${content.replace(/\n/g, "<br>")}</p>`;

    // Find the most important-looking sentences (containing numbers, key terms)
    const importantPatterns = /(\d+亿|\d+万|\d+%|[A-Z]{2,}|融资|上市|发布|突破|重磅|首发|独家|政策|监管)/;

    const formatted = paragraphs.map((p, i) => {
      const trimmed = p.trim().replace(/\n/g, "<br>");
      // Bold sentences with numbers or key terms
      const sentences = trimmed.split(/(?<=[。！？])/);
      const highlighted = sentences.map((s) => {
        if (importantPatterns.test(s) && s.length > 10) {
          return `<strong>${s}</strong>`;
        }
        return s;
      }).join("");

      // Highlight first paragraph as lead
      if (i === 0 && paragraphs.length > 2) {
        return `<p class="article-lead">${highlighted}</p>`;
      }
      return `<p>${highlighted}</p>`;
    }).join("");

    // Add simple takeaways for longer articles
    if (paragraphs.length >= 3) {
      const keySentences = paragraphs
        .flatMap((p) => p.split(/(?<=[。！？])/))
        .filter((s) => importantPatterns.test(s) && s.length > 10 && s.length < 120)
        .slice(0, 3);

      if (keySentences.length >= 2) {
        const takeawayItems = keySentences.map((s) => `<li>${s.trim()}</li>`).join("");
        return `<div class="key-takeaways"><h3>📌 核心要点</h3><ul>${takeawayItems}</ul></div>${formatted}`;
      }
    }

    return formatted;
  }
}
