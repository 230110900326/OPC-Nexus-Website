import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, In, Repository } from "typeorm";
import { AuthUser } from "../auth/auth-user.interface";
import { Article, ArticleStatus } from "../database/entities/article.entity";
import { ArticleSource } from "../database/entities/article-source.entity";
import { Category } from "../database/entities/category.entity";
import { Tag } from "../database/entities/tag.entity";
import { User } from "../database/entities/user.entity";
import { CreateArticleDto } from "./dto/create-article.dto";
import { ListArticlesDto } from "./dto/list-articles.dto";
import { UpdateArticleDto } from "./dto/update-article.dto";

const publicRelations = { category: true, tags: true, sources: true } as const;
const adminRelations = { ...publicRelations, operator: true } as const;

@Injectable()
export class ArticlesService {
  constructor(@InjectRepository(Article) private readonly articles: Repository<Article>, @InjectRepository(Category) private readonly categories: Repository<Category>, @InjectRepository(Tag) private readonly tags: Repository<Tag>) {}

  async list(input: ListArticlesDto, includeUnpublished = false) {
    const query = this.articles.createQueryBuilder("article").leftJoinAndSelect("article.category", "category").leftJoinAndSelect("article.tags", "tag").leftJoinAndSelect("article.sources", "source");
    if (includeUnpublished) query.leftJoinAndSelect("article.operator", "operator");
    else query.andWhere("article.status = :published AND article.published_at <= NOW()", { published: ArticleStatus.PUBLISHED });
    if (input.status && includeUnpublished) query.andWhere("article.status = :status", { status: input.status });
    if (input.type) query.andWhere("article.type = :type", { type: input.type });
    if (input.categoryId) query.andWhere("article.category_id = :categoryId", { categoryId: input.categoryId });
    if (input.category) query.andWhere("category.slug = :category", { category: input.category });
    if (input.source) query.andWhere("source.name ILIKE :source", { source: `%${input.source}%` });
    if (input.q) query.andWhere(new Brackets((where) => where.where("article.title ILIKE :q", { q: `%${input.q}%` }).orWhere("article.summary ILIKE :q", { q: `%${input.q}%` })));
    if (input.sort === "hot") query.orderBy("article.heat_score", "DESC");
    else if (input.sort === "recommended") query.orderBy("(article.heat_score + GREATEST(0, 168 - EXTRACT(EPOCH FROM (NOW() - article.published_at)) / 3600))", "DESC");
    else query.orderBy(includeUnpublished ? "article.updated_at" : "article.published_at", "DESC");
    query.addOrderBy("article.id", "DESC").skip((input.page - 1) * input.limit).take(input.limit);
    const [items, total] = await query.getManyAndCount();
    return { items, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
  }

  async findPublic(slug: string) {
    const article = await this.findOne(slug, false);
    const related = await this.articles.createQueryBuilder("article").leftJoinAndSelect("article.category", "category").leftJoinAndSelect("article.tags", "tag").leftJoinAndSelect("article.sources", "source").where("article.status = :status AND article.published_at <= NOW() AND article.id != :id", { status: ArticleStatus.PUBLISHED, id: article.id }).andWhere(article.category ? "article.category_id = :categoryId" : "article.type = :type", article.category ? { categoryId: article.category.id } : { type: article.type }).orderBy("article.heat_score", "DESC").addOrderBy("article.published_at", "DESC").take(3).getMany();
    return Object.assign(article, { related });
  }
  async findAdmin(id: string) { const article = await this.articles.findOne({ where: { id }, relations: adminRelations }); if (!article) throw new NotFoundException("文章不存在"); return article; }
  private async findOne(slug: string, includeUnpublished: boolean) { const where = includeUnpublished ? { slug } : { slug, status: ArticleStatus.PUBLISHED }; const article = await this.articles.findOne({ where, relations: includeUnpublished ? adminRelations : publicRelations }); if (!article || (!includeUnpublished && (!article.publishedAt || article.publishedAt > new Date()))) throw new NotFoundException("文章不存在或尚未发布"); return article; }

  async create(input: CreateArticleDto, actor: AuthUser) {
    await this.ensureSlug(input.slug);
    const article = this.articles.create({ slug: input.slug.trim(), title: input.title.trim(), summary: input.summary.trim(), type: input.type, originalUrl: input.originalUrl, coverImageUrl: input.coverImageUrl ?? null, publishedAt: input.publishedAt ? new Date(input.publishedAt) : null, operator: { id: actor.id } as User, ...this.policyFieldsForCreate(input) });
    article.category = input.categoryId ? await this.category(input.categoryId) : null;
    article.tags = await this.resolveTags(input.tagIds ?? []);
    article.sources = this.normalizeSources(input.sources ?? []) as ArticleSource[];
    return this.findAdmin((await this.articles.save(article)).id);
  }
  async update(id: string, input: UpdateArticleDto, actor: AuthUser) {
    return this.articles.manager.transaction(async (manager) => {
      const articleRepository = manager.getRepository(Article); const sourceRepository = manager.getRepository(ArticleSource); const categoryRepository = manager.getRepository(Category); const tagRepository = manager.getRepository(Tag);
      const article = await articleRepository.findOne({ where: { id }, relations: adminRelations }); if (!article) throw new NotFoundException("文章不存在"); if (article.status === ArticleStatus.PUBLISHED) throw new BadRequestException("已发布文章请先下线后再编辑");
      if (input.slug && input.slug !== article.slug && await articleRepository.exists({ where: { slug: input.slug } })) throw new ConflictException("文章 slug 已存在");
      Object.assign(article, this.scalars(input), { operator: { id: actor.id } as User });
      if (input.categoryId !== undefined) { article.category = input.categoryId ? await categoryRepository.findOneBy({ id: input.categoryId }) : null; if (input.categoryId && !article.category) throw new NotFoundException("分类不存在"); }
      if (input.tagIds !== undefined) { article.tags = input.tagIds.length ? await tagRepository.findBy({ id: In(input.tagIds) }) : []; if (article.tags.length !== input.tagIds.length) throw new BadRequestException("包含不存在的标签"); }
      const sources = input.sources === undefined ? undefined : this.normalizeSources(input.sources);
      if (sources) { article.sources = []; await sourceRepository.delete({ article: { id } }); }
      await articleRepository.save(article);
      if (sources?.length) await sourceRepository.save(sources.map((source) => sourceRepository.create({ ...source, article: { id } as Article })));
      const saved = await articleRepository.findOne({ where: { id }, relations: adminRelations }); if (!saved) throw new NotFoundException("文章不存在"); return saved;
    });
  }
  async submit(id: string, actor: AuthUser) { return this.transition(id, ArticleStatus.DRAFT, ArticleStatus.REVIEW, actor); }
  async publish(id: string, actor: AuthUser) { const article = await this.transition(id, ArticleStatus.REVIEW, ArticleStatus.PUBLISHED, actor); article.publishedAt ??= new Date(); await this.articles.save(article); return this.findAdmin(id); }
  async offline(id: string, actor: AuthUser) { return this.transition(id, ArticleStatus.PUBLISHED, ArticleStatus.OFFLINE, actor); }
  async returnToDraft(id: string, actor: AuthUser) { return this.transition(id, ArticleStatus.REVIEW, ArticleStatus.DRAFT, actor); }
  async restore(id: string, actor: AuthUser) { return this.transition(id, ArticleStatus.OFFLINE, ArticleStatus.DRAFT, actor); }

  private async transition(id: string, from: ArticleStatus, to: ArticleStatus, actor: AuthUser) { const article = await this.findAdmin(id); if (article.status !== from) throw new BadRequestException(`当前状态不能执行此操作：${article.status}`); article.status = to; article.operator = { id: actor.id } as User; return this.articles.save(article); }
  private scalars(input: UpdateArticleDto) { const value: Partial<Article> = {}; if (input.slug !== undefined) value.slug = input.slug.trim(); if (input.title !== undefined) value.title = input.title.trim(); if (input.summary !== undefined) value.summary = input.summary.trim(); if (input.type !== undefined) value.type = input.type; if (input.originalUrl !== undefined) value.originalUrl = input.originalUrl; if (input.coverImageUrl !== undefined) value.coverImageUrl = input.coverImageUrl || null; if (input.publishedAt !== undefined) value.publishedAt = input.publishedAt ? new Date(input.publishedAt) : null; return Object.assign(value, this.policyFieldsForUpdate(input)); }
  private policyFieldsForCreate(input: CreateArticleDto) { return { policyIssuer: input.policyIssuer ?? null, policyNumber: input.policyNumber ?? null, effectiveDate: input.effectiveDate ?? null, applicableRegion: input.applicableRegion ?? null, policyStatus: input.policyStatus ?? null, policyHighlights: input.policyHighlights ?? null, impactIndustries: input.impactIndustries ?? null }; }
  private policyFieldsForUpdate(input: UpdateArticleDto) { const value: Partial<Article> = {}; if (input.policyIssuer !== undefined) value.policyIssuer = input.policyIssuer || null; if (input.policyNumber !== undefined) value.policyNumber = input.policyNumber || null; if (input.effectiveDate !== undefined) value.effectiveDate = input.effectiveDate || null; if (input.applicableRegion !== undefined) value.applicableRegion = input.applicableRegion || null; if (input.policyStatus !== undefined) value.policyStatus = input.policyStatus || null; if (input.policyHighlights !== undefined) value.policyHighlights = input.policyHighlights || null; if (input.impactIndustries !== undefined) value.impactIndustries = input.impactIndustries || null; return value; }
  private normalizeSources(sources: NonNullable<CreateArticleDto["sources"]>) { if (sources.filter((source) => source.isPrimary === true).length > 1) throw new BadRequestException("只能设置一个主来源"); const hasPrimary = sources.some((source) => source.isPrimary === true); return sources.map((source, index) => ({ name: source.name.trim(), url: source.url, isPrimary: source.isPrimary ?? (!hasPrimary && index === 0) })); }
  private async category(id: string) { const value = await this.categories.findOneBy({ id }); if (!value) throw new NotFoundException("分类不存在"); return value; }
  private async resolveTags(ids: string[]) { const values = ids.length ? await this.tags.findBy({ id: In(ids) }) : []; if (values.length !== ids.length) throw new BadRequestException("包含不存在的标签"); return values; }
  private async ensureSlug(slug: string) { if (await this.articles.exists({ where: { slug } })) throw new ConflictException("文章 slug 已存在"); }
}
