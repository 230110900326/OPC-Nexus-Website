import { BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { Article, ArticleStatus, ArticleType } from "../database/entities/article.entity";
import { Category } from "../database/entities/category.entity";
import { Tag } from "../database/entities/tag.entity";
import { SystemRole } from "../database/entities/role.entity";
import { ArticlesService } from "./articles.service";

describe("ArticlesService state flow", () => {
  const save = jest.fn(async (value) => value); const articles = { save } as unknown as Repository<Article>;
  const audit = { record: jest.fn() };
  const service = new ArticlesService(articles, {} as Repository<Category>, {} as Repository<Tag>, { recordDelta: jest.fn() } as never, audit as never);
  const actor = { id: "8bb2042a-2a57-4d64-9695-05d53a6aa111", email: "editor@example.com", roles: [SystemRole.OPERATOR] };
  const article = { id: "90c5bb19-f037-448f-91df-598d1c798222", status: ArticleStatus.DRAFT, type: ArticleType.NEWS, publishedAt: null } as Article;
  beforeEach(() => { jest.clearAllMocks(); article.status = ArticleStatus.DRAFT; article.publishedAt = null; jest.spyOn(service, "findAdmin").mockResolvedValue(article); });
  it("moves a draft into review and records the operator", async () => { await service.submit(article.id, actor); expect(article.status).toBe(ArticleStatus.REVIEW); expect(article.operator?.id).toBe(actor.id); expect(save).toHaveBeenCalled(); });
  it("publishes only a reviewed article and assigns a publication time", async () => { article.status = ArticleStatus.REVIEW; await service.publish(article.id, actor); expect(article.status).toBe(ArticleStatus.PUBLISHED); expect(article.publishedAt).toBeInstanceOf(Date); });
  it("rejects an invalid transition", async () => { article.status = ArticleStatus.PUBLISHED; await expect(service.submit(article.id, actor)).rejects.toBeInstanceOf(BadRequestException); });
  it("normalizes exactly one primary source", () => { const values = (service as unknown as { normalizeSources: (sources: { name: string; url: string; isPrimary?: boolean }[]) => { isPrimary: boolean }[] }).normalizeSources([{ name: "A", url: "https://a.test" }, { name: "B", url: "https://b.test" }]); expect(values.map((value) => value.isPrimary)).toEqual([true, false]); });
});
