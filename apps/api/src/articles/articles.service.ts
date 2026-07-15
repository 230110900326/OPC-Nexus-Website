import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { AuthUser } from "../auth/auth-user.interface";
import { Article, ArticleStatus } from "../database/entities/article.entity";
import { Category } from "../database/entities/category.entity";
import { Tag } from "../database/entities/tag.entity";
import { CreateArticleDto } from "./dto/create-article.dto";
import { ListArticlesDto } from "./dto/list-articles.dto";
import { UpdateArticleDto } from "./dto/update-article.dto";

const relations = { category: true, tags: true, sources: true, operator: true } as const;

@Injectable()
export class ArticlesService {
  constructor(@InjectRepository(Article) private readonly articles: Repository<Article>, @InjectRepository(Category) private readonly categories: Repository<Category>, @InjectRepository(Tag) private readonly tags: Repository<Tag>) {}

  async list(input: ListArticlesDto, includeUnpublished = false) {
    const query = this.articles.createQueryBuilder("article").leftJoinAndSelect("article.category", "category").leftJoinAndSelect("article.tags", "tag").leftJoinAndSelect("article.sources", "source").leftJoinAndSelect("article.operator", "operator");
    if (!includeUnpublished) query.andWhere("article.status = :published", { published: ArticleStatus.PUBLISHED });
    if (input.status && includeUnpublished) query.andWhere("article.status = :status", { status: input.status });
    if (input.type) query.andWhere("article.type = :type", { type: input.type });
    if (input.categoryId) query.andWhere("article.category_id = :categoryId", { categoryId: input.categoryId });
    if (input.category) query.andWhere("category.slug = :category", { category: input.category });
    if (input.source) query.andWhere("source.name ILIKE :source", { source: `%${input.source}%` });
    if (input.q) query.andWhere(new Brackets((where) => where.where("article.title ILIKE :q", { q: `%${input.q}%` }).orWhere("article.summary ILIKE :q", { q: `%${input.q}%` })));
    query.orderBy(input.sort === "hot" ? "article.heat_score" : "article.published_at", "DESC").addOrderBy("article.id", "DESC").skip((input.page - 1) * input.limit).take(input.limit);
    const [items, total] = await query.getManyAndCount();
    return { items, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
  }

  async findPublic(slug: string) { return this.findOne(slug, false); }
  async findAdmin(id: string) { return this.articles.findOne({ where: { id }, relations }).then((article) => { if (!article) throw new NotFoundException("文章不存在"); return article; }); }
  async findOne(slug: string, includeUnpublished: boolean) {
    const where = includeUnpublished ? { slug } : { slug, status: ArticleStatus.PUBLISHED };
    const article = await this.articles.findOne({ where, relations });
    if (!article) throw new NotFoundException("文章不存在或尚未发布");
    return article;
  }

  async create(input: CreateArticleDto, actor: AuthUser) { const article = this.articles.create({ slug: input.slug.trim(), title: input.title.trim(), summary: input.summary.trim(), type: input.type, originalUrl: input.originalUrl, coverImageUrl: input.coverImageUrl ?? null, ...this.policyFields(input) }); await this.assignRelations(article, input, actor.id); return this.findAdmin((await this.articles.save(article)).id); }
  async update(id: string, input: UpdateArticleDto, actor: AuthUser) { const article = await this.findAdmin(id); if (article.status === ArticleStatus.PUBLISHED) throw new BadRequestException("已发布文章请先下线后再编辑"); Object.assign(article, this.scalars(input)); await this.assignRelations(article, input, actor.id); await this.articles.save(article); return this.findAdmin(id); }
  async submit(id: string, actor: AuthUser) { return this.transition(id, ArticleStatus.DRAFT, ArticleStatus.REVIEW, actor); }
  async publish(id: string, actor: AuthUser) { const article = await this.transition(id, ArticleStatus.REVIEW, ArticleStatus.PUBLISHED, actor); article.publishedAt = new Date(); await this.articles.save(article); return article; }
  async offline(id: string, actor: AuthUser) { return this.transition(id, ArticleStatus.PUBLISHED, ArticleStatus.OFFLINE, actor); }

  private async transition(id: string, from: ArticleStatus, to: ArticleStatus, actor: AuthUser) { const article = await this.findAdmin(id); if (article.status !== from) throw new BadRequestException(`当前状态不能执行此操作：${article.status}`); article.status = to; article.operator = { id: actor.id } as never; return this.articles.save(article); }
  private scalars(input: UpdateArticleDto) { const value: Partial<Article> = {}; if (input.slug !== undefined) value.slug = input.slug.trim(); if (input.title !== undefined) value.title = input.title.trim(); if (input.summary !== undefined) value.summary = input.summary.trim(); if (input.type !== undefined) value.type = input.type; if (input.originalUrl !== undefined) value.originalUrl = input.originalUrl; if (input.coverImageUrl !== undefined) value.coverImageUrl = input.coverImageUrl || null; return Object.assign(value, this.policyFields(input)); }
  private policyFields(input: Partial<CreateArticleDto>) { return { policyIssuer: input.policyIssuer ?? null, policyNumber: input.policyNumber ?? null, effectiveDate: input.effectiveDate ?? null, applicableRegion: input.applicableRegion ?? null, policyStatus: input.policyStatus ?? null, policyHighlights: input.policyHighlights ?? null, impactIndustries: input.impactIndustries ?? null }; }
  private async assignRelations(article: Article, input: Partial<CreateArticleDto>, actorId: string) { article.operator = { id: actorId } as never; if (input.categoryId !== undefined) article.category = input.categoryId ? await this.categories.findOneByOrFail({ id: input.categoryId }) : null; if (input.tagIds !== undefined) article.tags = input.tagIds.length ? await this.tags.findBy({ id: input.tagIds as never }) : []; if (input.sources !== undefined) { if (input.sources.filter((source) => source.isPrimary !== false).length > 1) throw new BadRequestException("只能设置一个主来源"); article.sources = input.sources.map((source, index) => ({ ...source, isPrimary: source.isPrimary ?? index === 0 })) as never; } }
}
