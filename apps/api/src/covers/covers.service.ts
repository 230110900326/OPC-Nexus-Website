import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Article } from "../database/entities/article.entity";
import { renderCoverSvg } from "./covers.renderer";

@Injectable()
export class CoversService {
  constructor(@InjectRepository(Article) private readonly articles: Repository<Article>) {}

  /** 根据文章 slug 生成 SVG 封面；文章不存在时返回 null。 */
  async svgForSlug(slug: string): Promise<string | null> {
    const article = await this.articles.findOne({
      where: { slug },
      relations: { category: true },
      select: { id: true, slug: true, title: true, type: true, category: { id: true, name: true } },
    });
    if (!article) return null;
    return renderCoverSvg({ title: article.title, type: article.type, category: article.category?.name ?? null });
  }
}
