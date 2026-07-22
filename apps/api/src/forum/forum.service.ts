import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, In, IsNull, Repository } from "typeorm";
import { AuthUser } from "../auth/auth-user.interface";
import { AUTOMATIC_FINANCIAL_REVIEW_REASON, findFinancialHighRiskTerms, normalizePlainText } from "../common/content-safety";
import { Comment, CommentStatus } from "../database/entities/comment.entity";
import { ForumSection } from "../database/entities/forum-section.entity";
import { MetricContentType } from "../database/entities/content-metric.entity";
import { NotificationType } from "../database/entities/notification.entity";
import { Post, PostStatus } from "../database/entities/post.entity";
import { Report, ReportStatus, ReportTargetType } from "../database/entities/report.entity";
import { User } from "../database/entities/user.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { RankingService } from "../ranking/ranking.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { CreatePostDto } from "./dto/create-post.dto";
import { ListPostsDto } from "./dto/list-posts.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

export type PublicForumUser = { id: string; displayName: string; avatarUrl: string | null; industry: string | null; company: string | null; jobTitle: string | null };
export type PublicComment = { id: string; body: string; status: CommentStatus; createdAt: Date; updatedAt: Date; parentId: string | null; author: PublicForumUser; children: PublicComment[] };

@Injectable()
export class ForumService {
  constructor(
    @InjectRepository(ForumSection) private readonly sections: Repository<ForumSection>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    private readonly notifications: NotificationsService,
    private readonly ranking: RankingService,
  ) {}

  async listSections() {
    return this.sections.createQueryBuilder("section")
      .loadRelationCountAndMap("section.postCount", "section.posts", "post", (query) => query.where("post.status = :status AND post.deleted_at IS NULL", { status: PostStatus.PUBLISHED }))
      .where("section.is_active = true").orderBy("section.sortOrder", "ASC").getMany();
  }

  async listPosts(input: ListPostsDto, userId?: string) {
    const query = this.posts.createQueryBuilder("post").leftJoinAndSelect("post.section", "section").leftJoinAndSelect("post.author", "author")
      .where(userId ? "post.author_id = :userId" : "post.status = :status", userId ? { userId } : { status: PostStatus.PUBLISHED });
    if (input.section) query.andWhere("(section.slug = :section OR section.id::text = :section)", { section: input.section });
    if (input.q) query.andWhere(new Brackets((where) => where.where("post.search_document @@ websearch_to_tsquery('simple', :q)", { q: input.q }).orWhere("post.title ILIKE :like OR post.body ILIKE :like", { like: `%${input.q}%` })));
    if (input.sort === "featured") query.andWhere("post.is_featured = true");
    query.orderBy("post.isPinned", "DESC").addOrderBy(input.sort === "hot" ? "post.heatScore" : "post.createdAt", "DESC").skip((input.page - 1) * input.limit).take(input.limit);
    const [items, total] = await query.getManyAndCount();
    return { items: items.map((post) => ({ ...this.publicPost(post), body: post.body.slice(0, 360) })), pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
  }

  async detail(id: string) {
    const post = await this.posts.findOne({ where: { id, status: PostStatus.PUBLISHED, deletedAt: IsNull() }, relations: { section: true, author: true } });
    if (!post) throw new NotFoundException("帖子不存在或不可见");
    await Promise.all([this.posts.increment({ id }, "viewCount", 1), this.ranking.recordDelta(MetricContentType.POST, id, { readCount: 1 })]);
    post.viewCount += 1;
    const comments = await this.comments.find({ where: { post: { id }, status: In([CommentStatus.PUBLISHED, CommentStatus.HIDDEN, CommentStatus.DELETED]) }, relations: { author: true, parent: true }, order: { createdAt: "ASC" } });
    return { ...this.publicPost(post), comments: this.commentTree(comments) };
  }

  async ownerDetail(id: string, user: AuthUser) { return this.publicPost(await this.ownedPost(id, user.id)); }

  async create(input: CreatePostDto, user: AuthUser) {
    const section = await this.section(input.sectionId);
    const title = normalizePlainText(input.title);
    const body = normalizePlainText(input.body);
    const riskTerms = findFinancialHighRiskTerms(`${title}\n${body}`);
    const status = input.status === PostStatus.PUBLISHED && riskTerms.length ? PostStatus.REVIEW : input.status;
    const saved = await this.posts.save(this.posts.create({ title, body, status, section, author: { id: user.id } as User }));
    if (status === PostStatus.REVIEW) await this.queueReview(ReportTargetType.POST, saved.id, user.id, riskTerms);
    const result = this.publicPost(await this.posts.findOneOrFail({ where: { id: saved.id }, relations: { author: true, section: true } }));
    return { ...result, requiresReview: status === PostStatus.REVIEW };
  }

  async update(id: string, input: UpdatePostDto, user: AuthUser) {
    const post = await this.ownedPost(id, user.id);
    if (post.status === PostStatus.HIDDEN) throw new ForbiddenException("已隐藏帖子不能编辑");
    if (input.title !== undefined) post.title = normalizePlainText(input.title);
    if (input.body !== undefined) post.body = normalizePlainText(input.body);
    if (input.sectionId !== undefined) post.section = await this.section(input.sectionId);
    if (input.status !== undefined) post.status = input.status;
    const riskTerms = findFinancialHighRiskTerms(`${post.title}\n${post.body}`);
    if (post.status === PostStatus.PUBLISHED && riskTerms.length) post.status = PostStatus.REVIEW;
    await this.posts.save(post);
    if (post.status === PostStatus.REVIEW && riskTerms.length) await this.queueReview(ReportTargetType.POST, post.id, user.id, riskTerms);
    return { ...this.publicPost(post), requiresReview: post.status === PostStatus.REVIEW };
  }

  async remove(id: string, user: AuthUser) { const post = await this.ownedPost(id, user.id); await this.posts.softRemove(post); return { id }; }

  async createComment(postId: string, input: CreateCommentDto, user: AuthUser) {
    const post = await this.posts.findOne({ where: { id: postId, status: PostStatus.PUBLISHED, deletedAt: IsNull() }, relations: { author: true } });
    if (!post) throw new NotFoundException("帖子不存在");
    if (post.isLocked) throw new BadRequestException("该帖子已锁定，不能继续回复");
    let parent: Comment | null = null;
    if (input.parentId) {
      parent = await this.comments.findOne({ where: { id: input.parentId }, relations: { post: true, author: true } });
      if (!parent || parent.post.id !== postId) throw new BadRequestException("回复的评论不属于该帖子");
      if (parent.status !== CommentStatus.PUBLISHED) throw new BadRequestException("该评论当前不能回复");
    }
    const body = normalizePlainText(input.body);
    const riskTerms = findFinancialHighRiskTerms(body);
    const status = riskTerms.length ? CommentStatus.REVIEW : CommentStatus.PUBLISHED;
    const comment = await this.comments.save(this.comments.create({ body, status, post, parent, author: { id: user.id } as User }));
    if (status === CommentStatus.REVIEW) {
      await this.queueReview(ReportTargetType.COMMENT, comment.id, user.id, riskTerms);
    } else {
      await Promise.all([this.posts.increment({ id: postId }, "commentCount", 1), this.posts.increment({ id: postId }, "heatScore", 2), this.ranking.recordDelta(MetricContentType.POST, postId, { commentCount: 1 })]);
      const recipientId = parent?.author.id ?? post.author.id;
      if (recipientId !== user.id) await this.notifications.create(recipientId, NotificationType.COMMENT_REPLY, "收到新的回复", `有人回复了你在“${post.title}”中的内容。`, "post", post.id);
    }
    const result = this.publicComment(await this.comments.findOneOrFail({ where: { id: comment.id }, relations: { author: true, parent: true } }));
    return { ...result, requiresReview: status === CommentStatus.REVIEW };
  }

  async updateComment(id: string, input: UpdateCommentDto, user: AuthUser) {
    const comment = await this.comments.findOne({ where: { id }, relations: { author: true, parent: true, post: true } });
    if (!comment) throw new NotFoundException("评论不存在");
    if (comment.author.id !== user.id) throw new ForbiddenException("只能编辑自己的评论");
    if (![CommentStatus.PUBLISHED, CommentStatus.REVIEW].includes(comment.status)) throw new ForbiddenException("该评论不能编辑");
    const wasPublished = comment.status === CommentStatus.PUBLISHED;
    comment.body = normalizePlainText(input.body);
    const riskTerms = findFinancialHighRiskTerms(comment.body);
    if (riskTerms.length) comment.status = CommentStatus.REVIEW;
    await this.comments.save(comment);
    if (comment.status === CommentStatus.REVIEW) {
      if (wasPublished) await this.posts.decrement({ id: comment.post.id }, "commentCount", 1);
      if (riskTerms.length) await this.queueReview(ReportTargetType.COMMENT, comment.id, user.id, riskTerms);
    }
    return { ...this.publicComment(comment), requiresReview: comment.status === CommentStatus.REVIEW };
  }

  async removeComment(id: string, user: AuthUser) {
    const comment = await this.comments.findOne({ where: { id }, relations: { author: true, post: true } });
    if (!comment) throw new NotFoundException("评论不存在");
    if (comment.author.id !== user.id) throw new ForbiddenException("只能删除自己的评论");
    if (comment.status === CommentStatus.PUBLISHED) await this.posts.decrement({ id: comment.post.id }, "commentCount", 1);
    comment.status = CommentStatus.DELETED; comment.body = "该评论已由作者删除"; await this.comments.save(comment); return { id };
  }

  private async queueReview(targetType: ReportTargetType.POST | ReportTargetType.COMMENT, targetId: string, reporterId: string, terms: readonly string[]) {
    const exists = await this.reports.exists({ where: { targetType, targetId, status: ReportStatus.PENDING } });
    if (exists) return;
    await this.reports.save(this.reports.create({ reporter: { id: reporterId } as User, targetType, targetId, reason: AUTOMATIC_FINANCIAL_REVIEW_REASON, details: `命中词：${terms.join("、")}`, status: ReportStatus.PENDING }));
  }

  private async section(id: string) { const section = await this.sections.findOneBy({ id, isActive: true }); if (!section) throw new NotFoundException("论坛板块不存在或已停用"); return section; }
  private async ownedPost(id: string, userId: string) { const post = await this.posts.findOne({ where: { id, deletedAt: IsNull() }, relations: { author: true, section: true } }); if (!post) throw new NotFoundException("帖子不存在"); if (post.author.id !== userId) throw new ForbiddenException("只能修改自己的帖子"); return post; }
  private safeUser(user: User): PublicForumUser { return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, industry: user.industry, company: user.company, jobTitle: user.jobTitle }; }
  private publicPost(post: Post) { return { id: post.id, title: post.title, body: post.body, status: post.status, isLocked: post.isLocked, isPinned: post.isPinned, isFeatured: post.isFeatured, viewCount: post.viewCount, commentCount: post.commentCount, heatScore: post.heatScore, createdAt: post.createdAt, updatedAt: post.updatedAt, section: post.section, author: this.safeUser(post.author) }; }
  private publicComment(comment: Comment): PublicComment { return { id: comment.id, body: comment.status === CommentStatus.HIDDEN ? "该评论已由社区审核隐藏" : comment.status === CommentStatus.REVIEW ? "该评论正在审核" : comment.body, status: comment.status, createdAt: comment.createdAt, updatedAt: comment.updatedAt, parentId: comment.parent?.id ?? null, author: this.safeUser(comment.author), children: [] }; }
  private commentTree(comments: Comment[]) { const mapped = new Map(comments.map((comment) => [comment.id, this.publicComment(comment)])); const roots: PublicComment[] = []; for (const comment of comments) { const value = mapped.get(comment.id)!; const parent = comment.parent ? mapped.get(comment.parent.id) : undefined; if (parent) parent.children.push(value); else roots.push(value); } return roots; }
}
