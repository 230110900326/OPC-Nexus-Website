import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { Article, ArticleStatus } from "../database/entities/article.entity";
import { Post, PostStatus } from "../database/entities/post.entity";
import { SearchContentType, SearchDto } from "./dto/search.dto";

export type SearchResult = { id: string; contentType: "article" | "post" | "video"; subtype: string; title: string; excerpt: string; url: string; coverImageUrl: string | null; category: string | null; source: string | null; publishedAt: Date | null };
@Injectable()
export class SearchService {
  constructor(@InjectRepository(Article) private readonly articles: Repository<Article>, @InjectRepository(Post) private readonly posts: Repository<Post>) {}
  async search(input: SearchDto) {
    const offset = (input.page - 1) * input.limit; const fetchSize = offset + input.limit;
    const includeArticles = [SearchContentType.ALL, SearchContentType.ARTICLE].includes(input.type);
    const includePosts = [SearchContentType.ALL, SearchContentType.POST].includes(input.type);
    const [articleData, postData] = await Promise.all([includeArticles ? this.searchArticles(input, input.type === SearchContentType.ALL ? 0 : offset, input.type === SearchContentType.ALL ? fetchSize : input.limit) : Promise.resolve({ items: [] as SearchResult[], total: 0 }), includePosts ? this.searchPosts(input, input.type === SearchContentType.ALL ? 0 : offset, input.type === SearchContentType.ALL ? fetchSize : input.limit) : Promise.resolve({ items: [] as SearchResult[], total: 0 })]);
    let items = [...articleData.items, ...postData.items].sort((a, b) => Number(b.publishedAt ?? 0) - Number(a.publishedAt ?? 0));
    if (input.type === SearchContentType.ALL) items = items.slice(offset, offset + input.limit);
    const total = articleData.total + postData.total;
    return { items, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) }, availableTypes: ["article", "post"] };
  }
  private async searchArticles(input: SearchDto, skip: number, take: number) {
    const query = this.articles.createQueryBuilder("article").leftJoinAndSelect("article.category", "category").leftJoinAndSelect("article.sources", "source").where("article.status = :status AND article.published_at <= NOW()", { status: ArticleStatus.PUBLISHED }).andWhere(new Brackets((where) => where.where("article.search_document @@ websearch_to_tsquery('simple', :query)", { query: input.q }).orWhere("article.title ILIKE :like OR article.summary ILIKE :like", { like: `%${input.q}%` })));
    if (input.category) query.andWhere("(category.slug = :category OR category.id::text = :category)", { category: input.category }); if (input.source) query.andWhere("source.name ILIKE :source", { source: `%${input.source}%` }); if (input.from) query.andWhere("article.published_at >= :from", { from: input.from }); if (input.to) query.andWhere("article.published_at <= :to", { to: `${input.to.slice(0, 10)}T23:59:59.999Z` });
    query.addSelect("ts_rank(article.search_document, websearch_to_tsquery('simple', :query))", "search_rank").distinct(true).orderBy("search_rank", "DESC").addOrderBy("article.published_at", "DESC").skip(skip).take(take);
    const [values, total] = await query.getManyAndCount(); return { total, items: values.map((article): SearchResult => ({ id: article.id, contentType: "article", subtype: article.type, title: article.title, excerpt: article.summary, url: `/articles/${article.slug}`, coverImageUrl: article.coverImageUrl, category: article.category?.name ?? null, source: article.sources.find((value) => value.isPrimary)?.name ?? article.sources[0]?.name ?? null, publishedAt: article.publishedAt })) };
  }
  private async searchPosts(input: SearchDto, skip: number, take: number) {
    const query = this.posts.createQueryBuilder("post").leftJoinAndSelect("post.section", "section").leftJoinAndSelect("post.author", "author").where("post.status = :status AND post.deleted_at IS NULL", { status: PostStatus.PUBLISHED }).andWhere(new Brackets((where) => where.where("post.search_document @@ websearch_to_tsquery('simple', :query)", { query: input.q }).orWhere("post.title ILIKE :like OR post.body ILIKE :like", { like: `%${input.q}%` })));
    if (input.category) query.andWhere("(section.slug = :category OR section.id::text = :category)", { category: input.category }); if (input.source) query.andWhere("author.display_name ILIKE :source", { source: `%${input.source}%` }); if (input.from) query.andWhere("post.created_at >= :from", { from: input.from }); if (input.to) query.andWhere("post.created_at <= :to", { to: `${input.to.slice(0, 10)}T23:59:59.999Z` });
    query.orderBy("ts_rank(post.search_document, websearch_to_tsquery('simple', :query))", "DESC").addOrderBy("post.created_at", "DESC").skip(skip).take(take);
    const [values, total] = await query.getManyAndCount(); return { total, items: values.map((post): SearchResult => ({ id: post.id, contentType: "post", subtype: "discussion", title: post.title, excerpt: post.body.slice(0, 280), url: `/community/posts/${post.id}`, coverImageUrl: null, category: post.section.name, source: post.author.displayName, publishedAt: post.createdAt })) };
  }
}
