import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Article } from "../database/entities/article.entity";
import { ContentFormattingService } from "./content-formatting.service";

@Controller("admin/content-formatting")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN, SystemRole.OPERATOR, SystemRole.EDITOR)
export class ContentFormattingController {
  constructor(
    private readonly formatting: ContentFormattingService,
    @InjectRepository(Article) private readonly articles: Repository<Article>,
  ) {}

  @Post("articles/:id/format")
  async formatArticle(@Param("id", ParseUUIDPipe) id: string, @Body("mode") mode?: "ai" | "rule") {
    const article = await this.articles.findOne({ where: { id } });
    if (!article) return { success: false, error: { message: "文章不存在" } };

    let result: { html: string; takeaways: string[]; model: string } | null = null;

    if (mode === "rule" || !process.env.CONTENT_FORMAT_API_KEY) {
      const html = this.formatting.formatArticleRuleBased(article.content || "");
      result = { html, takeaways: [], model: "rule-based" };
    } else {
      result = await this.formatting.formatArticle(article.title, article.content || "");
    }

    if (!result) {
      return { success: false, error: { message: "格式化失败，请检查 AI 配置" } };
    }

    // Store formatted content
    article.content = result.html;
    await this.articles.save(article);

    return {
      success: true,
      data: {
        id: article.id,
        takeaways: result.takeaways,
        model: result.model,
        contentLength: result.html.length,
      },
    };
  }

  @Post("articles/batch-format")
  async batchFormat(@Body("mode") mode?: "ai" | "rule") {
    const articles = await this.articles.find({
      where: { status: "published" as any },
      order: { createdAt: "DESC" as any },
      take: 20,
    });

    const results: any[] = [];
    for (const article of articles) {
      if (!article.content || article.content.includes("article-body") || article.content.includes("key-takeaways")) {
        continue; // already formatted
      }
      let result: { html: string; takeaways: string[]; model: string } | null = null;
      if (mode === "rule" || !process.env.CONTENT_FORMAT_API_KEY) {
        const html = this.formatting.formatArticleRuleBased(article.content);
        result = { html, takeaways: [], model: "rule-based" };
      } else {
        result = await this.formatting.formatArticle(article.title, article.content);
      }
      if (result) {
        article.content = result.html;
        await this.articles.save(article);
        results.push({ id: article.id, title: article.title.slice(0, 40), model: result.model });
      }
    }

    return { success: true, data: { formatted: results.length, articles: results } };
  }
}
