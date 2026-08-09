import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { AuthUser } from "../auth/auth-user.interface";
import { AUTOMATIC_FINANCIAL_REVIEW_REASON, findFinancialHighRiskTerms, normalizePlainText } from "../common/content-safety";
import { Report, ReportStatus, ReportTargetType } from "../database/entities/report.entity";
import { CreateCommentDto } from "../forum/dto/create-comment.dto";
import { UpdateCommentDto } from "../forum/dto/update-comment.dto";
import { Article, ArticleStatus } from "../database/entities/article.entity";
import { Comment, CommentStatus } from "../database/entities/comment.entity";
import { Favorite, FavoriteTargetType } from "../database/entities/favorite.entity";
import { Follow, FollowTargetType } from "../database/entities/follow.entity";
import { Like, LikeTargetType } from "../database/entities/like.entity";
import { Post, PostStatus } from "../database/entities/post.entity";
import { User } from "../database/entities/user.entity";
import { Video } from "../database/entities/video.entity";
import { Creator } from "../database/entities/creator.entity";
import { MetricContentType } from "../database/entities/content-metric.entity";
import { NotificationType } from "../database/entities/notification.entity";
import { InteractionRiskService } from "../ranking/interaction-risk.service";
import { RankingService } from "../ranking/ranking.service";
import { NotificationsService } from "../notifications/notifications.service";
import { DemandStatus, OpcDemand } from "../database/entities/opc-demand.entity";

export type InteractionContext = { ip?: string; device?: string };

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(Like) private readonly likes: Repository<Like>,
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
    @InjectRepository(Follow) private readonly follows: Repository<Follow>,
    @InjectRepository(Article) private readonly articles: Repository<Article>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Video) private readonly videos: Repository<Video>,
    @InjectRepository(Creator) private readonly creators: Repository<Creator>,
    @InjectRepository(OpcDemand) private readonly demands: Repository<OpcDemand>,
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    private readonly risk: InteractionRiskService,
    private readonly ranking: RankingService,
    private readonly notifications: NotificationsService,
  ) {}

  async addLike(userId: string, targetType: LikeTargetType, targetId: string, context?: InteractionContext) {
    await this.validateContent(targetType, targetId);
    const check = await this.riskCheck(userId, targetType, targetId, "like", context);
    if (!check.allowed) return { active: false, excluded: true, reason: check.reason, count: await this.likes.count({ where: { targetType, targetId } }) };
    const where = { user: { id: userId }, targetType, targetId };
    const exists = await this.likes.exists({ where });
    if (!exists) {
      await this.likes.save(this.likes.create({ user: { id: userId } as User, targetType, targetId }));
      await this.ranking.recordDelta(this.metricType(targetType), targetId, { likeCount: 1 });
      await this.notifyOwner(userId, targetType, targetId, "liked");
    }
    return { active: true, count: await this.likes.count({ where: { targetType, targetId } }) };
  }

  async removeLike(userId: string, targetType: LikeTargetType, targetId: string) {
    const result = await this.likes.delete({ user: { id: userId }, targetType, targetId });
    if (result.affected) await this.ranking.recordDelta(this.metricType(targetType), targetId, { likeCount: -1 });
    return { active: false, count: await this.likes.count({ where: { targetType, targetId } }) };
  }

  async addFavorite(userId: string, targetType: FavoriteTargetType, targetId: string, context?: InteractionContext) {
    await this.validateContent(targetType, targetId);
    const check = await this.riskCheck(userId, targetType, targetId, "favorite", context);
    if (!check.allowed) return { active: false, excluded: true, reason: check.reason, count: await this.favorites.count({ where: { targetType, targetId } }) };
    const where = { user: { id: userId }, targetType, targetId };
    const exists = await this.favorites.exists({ where });
    if (!exists) {
      await this.favorites.save(this.favorites.create({ user: { id: userId } as User, targetType, targetId }));
      await this.ranking.recordDelta(this.metricType(targetType), targetId, { favoriteCount: 1 });
      await this.notifyOwner(userId, targetType, targetId, "collected");
    }
    return { active: true, count: await this.favorites.count({ where: { targetType, targetId } }) };
  }

  async removeFavorite(userId: string, targetType: FavoriteTargetType, targetId: string) {
    const result = await this.favorites.delete({ user: { id: userId }, targetType, targetId });
    if (result.affected) await this.ranking.recordDelta(this.metricType(targetType), targetId, { favoriteCount: -1 });
    return { active: false, count: await this.favorites.count({ where: { targetType, targetId } }) };
  }

  async addFollow(userId: string, targetType: FollowTargetType, targetId: string) {
    await this.validateFollow(targetType, targetId);
    if (targetType === FollowTargetType.USER && userId === targetId) throw new BadRequestException("不能关注自己");
    const where = { follower: { id: userId }, targetType, targetId };
    if (!await this.follows.exists({ where })) await this.follows.save(this.follows.create({ follower: { id: userId } as User, targetType, targetId }));
    return { active: true, count: await this.follows.count({ where: { targetType, targetId } }) };
  }

  async removeFollow(userId: string, targetType: FollowTargetType, targetId: string) {
    await this.follows.delete({ follower: { id: userId }, targetType, targetId });
    return { active: false, count: await this.follows.count({ where: { targetType, targetId } }) };
  }

  async summary(targetType: string, targetId: string) { return { likes: await this.likes.count({ where: { targetType: targetType as LikeTargetType, targetId } }), favorites: await this.favorites.count({ where: { targetType: targetType as FavoriteTargetType, targetId } }), followers: await this.follows.count({ where: { targetType: targetType as FollowTargetType, targetId } }) }; }

  async mine(userId: string) { const [likes, favorites, follows] = await Promise.all([this.likes.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" } }), this.favorites.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" } }), this.follows.find({ where: { follower: { id: userId } }, order: { createdAt: "DESC" } })]); return { likes, favorites, follows }; }

  /** 互动状态：点赞/收藏/评论计数 + 当前用户是否已点赞/收藏（登录态可选）。 */
  async contentState(targetType: string, targetId: string, userId?: string) {
    await this.resolveTarget(targetType, targetId);
    const [likes, favorites, comments] = await Promise.all([
      this.likes.count({ where: { targetType: targetType as LikeTargetType, targetId } }),
      this.favorites.count({ where: { targetType: targetType as FavoriteTargetType, targetId } }),
      this.comments.count({ where: { targetType, targetId, status: CommentStatus.PUBLISHED } }),
    ]);
    let isLiked = false, isFavorited = false;
    if (userId) {
      [isLiked, isFavorited] = await Promise.all([
        this.likes.exists({ where: { user: { id: userId }, targetType: targetType as LikeTargetType, targetId } }),
        this.favorites.exists({ where: { user: { id: userId }, targetType: targetType as FavoriteTargetType, targetId } }),
      ]);
    }
    return { likes, favorites, comments, isLiked, isFavorited };
  }

  /** 读取某篇文章/视频的评论树（帖子评论走论坛模块）。 */
  async contentComments(targetType: string, targetId: string) {
    await this.resolveTarget(targetType, targetId);
    const comments = await this.comments.find({ where: { targetType, targetId, status: In([CommentStatus.PUBLISHED, CommentStatus.HIDDEN, CommentStatus.DELETED]) }, relations: { author: true, parent: true }, order: { createdAt: "ASC" } });
    return { comments: this.commentTree(comments), count: comments.filter((c) => c.status === CommentStatus.PUBLISHED).length };
  }

  async createContentComment(targetType: string, targetId: string, input: CreateCommentDto, user: AuthUser) {
    const target = await this.resolveTarget(targetType, targetId);
    let parent: Comment | null = null;
    if (input.parentId) {
      parent = await this.comments.findOne({ where: { id: input.parentId }, relations: { author: true } });
      if (!parent || parent.targetType !== targetType || parent.targetId !== targetId) throw new BadRequestException("回复的评论不属于该内容");
      if (parent.status !== CommentStatus.PUBLISHED) throw new BadRequestException("该评论当前不能回复");
    }
    const body = normalizePlainText(input.body);
    const riskTerms = findFinancialHighRiskTerms(body);
    const status = riskTerms.length ? CommentStatus.REVIEW : CommentStatus.PUBLISHED;
    const comment = await this.comments.save(this.comments.create({ body, status, targetType, targetId, parent, author: { id: user.id } as User }));
    if (status === CommentStatus.REVIEW) {
      await this.queueReview(comment.id, user.id, riskTerms);
    } else {
      await this.ranking.recordDelta(this.metricType(targetType as LikeTargetType), targetId, { commentCount: 1 });
      const recipientId = parent?.author.id ?? target.ownerId;
      if (recipientId && recipientId !== user.id) await this.notifications.create(recipientId, NotificationType.COMMENT_REPLY, "收到新的回复", `有人回复了“${target.title}”。`, targetType, target.url);
    }
    const result = this.publicComment(await this.comments.findOneOrFail({ where: { id: comment.id }, relations: { author: true, parent: true } }));
    return { ...result, requiresReview: status === CommentStatus.REVIEW };
  }

  async updateContentComment(id: string, input: UpdateCommentDto, user: AuthUser) {
    const comment = await this.comments.findOne({ where: { id }, relations: { author: true, parent: true } });
    if (!comment) throw new NotFoundException("评论不存在");
    if (comment.author.id !== user.id) throw new ForbiddenException("只能编辑自己的评论");
    if (![CommentStatus.PUBLISHED, CommentStatus.REVIEW].includes(comment.status)) throw new ForbiddenException("该评论不能编辑");
    comment.body = normalizePlainText(input.body);
    const riskTerms = findFinancialHighRiskTerms(comment.body);
    if (riskTerms.length) comment.status = CommentStatus.REVIEW;
    await this.comments.save(comment);
    if (riskTerms.length) await this.queueReview(comment.id, user.id, riskTerms);
    return { ...this.publicComment(comment), requiresReview: comment.status === CommentStatus.REVIEW };
  }

  async removeContentComment(id: string, user: AuthUser) {
    const comment = await this.comments.findOne({ where: { id }, relations: { author: true } });
    if (!comment) throw new NotFoundException("评论不存在");
    if (comment.author.id !== user.id) throw new ForbiddenException("只能删除自己的评论");
    comment.status = CommentStatus.DELETED; comment.body = "该评论已由作者删除"; await this.comments.save(comment); return { id };
  }

  /** 我的收藏：文章/视频/帖子/需求目标信息。 */
  async myFavorites(userId: string) {
    const rows = await this.favorites.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 200 });
    return this.resolveInteractions(rows.map((row) => ({ targetType: row.targetType, targetId: row.targetId, createdAt: row.createdAt })));
  }

  /** 我的点赞：文章/视频/帖子等目标信息。 */
  async myLikes(userId: string) {
    const rows = await this.likes.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 200 });
    return this.resolveInteractions(rows.map((row) => ({ targetType: row.targetType, targetId: row.targetId, createdAt: row.createdAt })));
  }

  /** 我的评论：本人发表过的评论（帖子/文章/视频），附带目标信息。 */
  async myComments(userId: string) {
    const comments = await this.comments.find({ where: { author: { id: userId } }, order: { createdAt: "DESC" }, take: 200 });
    const maps = await this.loadTargetMaps(this.groupTargets(comments.map((c) => ({ targetType: c.targetType, targetId: c.targetId }))));
    return comments.map((c) => ({ id: c.id, body: c.body, status: c.status, createdAt: c.createdAt, parentId: c.parent?.id ?? null, target: this.targetInfo(c.targetType, c.targetId, maps) })).filter((item) => item.target);
  }

  /** Find the content owner and notify them (if it's not their own action). */
  private async notifyOwner(actorId: string, targetType: string, targetId: string, action: "liked" | "collected") {
    try {
      let ownerId: string | undefined;
      let title = "";
      let targetUrl = "";
      if (targetType === LikeTargetType.ARTICLE || targetType === FavoriteTargetType.ARTICLE) {
        const article = await this.articles.findOne({ where: { id: targetId }, relations: { operator: true } });
        ownerId = article?.operator?.id;
        title = article?.title ?? "";
        targetUrl = `/articles/${(article as any)?.slug ?? targetId}`;
      } else if (targetType === LikeTargetType.POST || targetType === FavoriteTargetType.POST) {
        const post = await this.posts.findOne({ where: { id: targetId }, relations: { author: true } });
        ownerId = post?.author?.id;
        title = post?.title ?? "";
        targetUrl = `/community/posts/${targetId}`;
      } else if (targetType === LikeTargetType.COMMENT) {
        const comment = await this.comments.findOne({ where: { id: targetId }, relations: { author: true, post: true } });
        ownerId = comment?.author?.id;
        title = comment?.body?.slice(0, 80) ?? "";
        targetUrl = `/community/posts/${(comment as any)?.post?.id ?? ""}`;
      }
      if (!ownerId || ownerId === actorId) return;

      const actor = await this.users.findOneBy({ id: actorId });
      const actorName = actor?.displayName ?? "一位用户";
      const verb = action === "liked" ? "赞了" : "收藏了";
      const type = NotificationType.INTERACTION;
      await this.notifications.create(ownerId, type, `${actorName} ${verb}你的内容`, title.slice(0, 120), targetType, targetUrl);
    } catch { /* best-effort */ }
  }

  private async validateContent(targetType: LikeTargetType | FavoriteTargetType, id: string) {
    let exists = false;
    if (targetType === FavoriteTargetType.DEMAND) exists = await this.demands.exists({ where: { id, status: DemandStatus.PUBLISHED } });
    else if (targetType === LikeTargetType.VIDEO) exists = await this.videos.exists({ where: { id, isPublished: true } });
    else if (targetType === LikeTargetType.ARTICLE) exists = await this.articles.exists({ where: { id, status: ArticleStatus.PUBLISHED } });
    else if (targetType === LikeTargetType.POST) exists = await this.posts.exists({ where: { id, status: PostStatus.PUBLISHED } });
    else if (targetType === LikeTargetType.COMMENT) exists = await this.comments.exists({ where: { id, status: CommentStatus.PUBLISHED } });
    if (!exists) throw new NotFoundException("互动目标不存在或不可见");
  }

  private async validateFollow(targetType: FollowTargetType, id: string) {
    const exists = targetType === FollowTargetType.CREATOR ? await this.creators.exists({ where: { id, isEnabled: true } }) : await this.users.exists({ where: { id, isActive: true } });
    if (!exists) throw new NotFoundException("关注目标不存在");
  }

  private metricType(type: LikeTargetType | FavoriteTargetType) {
    return type === FavoriteTargetType.DEMAND ? MetricContentType.DEMAND : type === LikeTargetType.VIDEO ? MetricContentType.VIDEO : type === LikeTargetType.POST || type === LikeTargetType.COMMENT ? MetricContentType.POST : MetricContentType.ARTICLE;
  }

  private async riskCheck(userId: string, targetType: string, targetId: string, action: string, context?: InteractionContext) {
    if (!context) return { allowed: true, reason: null };
    const user = await this.users.findOneBy({ id: userId });
    return this.risk.inspect({ userId, targetType, targetId, action, ip: context.ip, device: context.device, accountCreatedAt: user?.createdAt });
  }

  /** 校验评论目标存在且可见，返回用于通知的目标信息。 */
  private async resolveTarget(targetType: string, targetId: string) {
    if (targetType === "article") {
      const article = await this.articles.findOne({ where: { id: targetId, status: ArticleStatus.PUBLISHED }, relations: { operator: true } });
      if (!article) throw new NotFoundException("文章不存在或不可见");
      return { ownerId: article.operator?.id, title: article.title, url: `/articles/${article.slug}` };
    }
    if (targetType === "video") {
      const video = await this.videos.findOne({ where: { id: targetId, isPublished: true } });
      if (!video) throw new NotFoundException("视频不存在或不可见");
      return { ownerId: undefined, title: video.title, url: `/videos/${video.id}` };
    }
    if (targetType === "post") {
      const post = await this.posts.findOne({ where: { id: targetId, status: PostStatus.PUBLISHED, deletedAt: IsNull() }, relations: { author: true } });
      if (!post) throw new NotFoundException("帖子不存在或不可见");
      return { ownerId: post.author.id, title: post.title, url: `/community/posts/${post.id}` };
    }
    throw new BadRequestException("不支持的评论目标类型");
  }

  private publicComment(comment: Comment) {
    return { id: comment.id, body: comment.status === CommentStatus.HIDDEN ? "该评论已由社区审核隐藏" : comment.status === CommentStatus.REVIEW ? "该评论正在审核" : comment.body, status: comment.status, createdAt: comment.createdAt, updatedAt: comment.updatedAt, parentId: comment.parent?.id ?? null, author: { id: comment.author.id, displayName: comment.author.displayName, avatarUrl: comment.author.avatarUrl, industry: comment.author.industry, company: comment.author.company, jobTitle: comment.author.jobTitle } };
  }

  private commentTree(comments: Comment[]) { const mapped = new Map<string, any>(comments.map((comment) => [comment.id, this.publicComment(comment)])); const roots: any[] = []; for (const comment of comments) { const value = mapped.get(comment.id)!; const parent = comment.parent ? mapped.get(comment.parent.id) : undefined; if (parent) parent.children.push(value); else roots.push(value); } return roots; }

  private async queueReview(targetId: string, reporterId: string, terms: readonly string[]) {
    const exists = await this.reports.exists({ where: { targetType: ReportTargetType.COMMENT, targetId, status: ReportStatus.PENDING } });
    if (exists) return;
    await this.reports.save(this.reports.create({ reporter: { id: reporterId } as User, targetType: ReportTargetType.COMMENT, targetId, reason: AUTOMATIC_FINANCIAL_REVIEW_REASON, details: `命中词：${terms.join("、")}`, status: ReportStatus.PENDING }));
  }

  private groupTargets(rows: { targetType: string | null; targetId: string | null }[]) {
    const articleIds = new Set<string>(), postIds = new Set<string>(), videoIds = new Set<string>(), demandIds = new Set<string>();
    for (const row of rows) {
      if (!row.targetType || !row.targetId) continue;
      if (row.targetType === "article") articleIds.add(row.targetId);
      else if (row.targetType === "post") postIds.add(row.targetId);
      else if (row.targetType === "video") videoIds.add(row.targetId);
      else if (row.targetType === "demand") demandIds.add(row.targetId);
    }
    return { articleIds, postIds, videoIds, demandIds };
  }

  private async loadTargetMaps(group: { articleIds: Set<string>; postIds: Set<string>; videoIds: Set<string>; demandIds: Set<string> }) {
    const [articles, posts, videos, demands] = await Promise.all([
      group.articleIds.size ? this.articles.find({ where: { id: In([...group.articleIds]) } }) : Promise.resolve([]),
      group.postIds.size ? this.posts.find({ where: { id: In([...group.postIds]) } }) : Promise.resolve([]),
      group.videoIds.size ? this.videos.find({ where: { id: In([...group.videoIds]) } }) : Promise.resolve([]),
      group.demandIds.size ? this.demands.find({ where: { id: In([...group.demandIds]) } }) : Promise.resolve([]),
    ]);
    return { articles: new Map(articles.map((item) => [item.id, item])), posts: new Map(posts.map((item) => [item.id, item])), videos: new Map(videos.map((item) => [item.id, item])), demands: new Map(demands.map((item) => [item.id, item])) };
  }

  private targetInfo(targetType: string | null, targetId: string | null, maps: { articles: Map<string, Article>; posts: Map<string, Post>; videos: Map<string, Video>; demands: Map<string, OpcDemand> }): any {
    if (!targetType || !targetId) return null;
    if (targetType === "article") { const item = maps.articles.get(targetId); if (!item) return null; return { targetType, targetId, title: item.title, url: `/articles/${item.slug}`, excerpt: item.content.replace(/<[^>]+>/g, "").slice(0, 100) }; }
    if (targetType === "post") { const item = maps.posts.get(targetId); if (!item) return null; return { targetType, targetId, title: item.title, url: `/community/posts/${item.id}`, excerpt: item.body.slice(0, 100) }; }
    if (targetType === "video") { const item = maps.videos.get(targetId); if (!item) return null; return { targetType, targetId, title: item.title, url: `/videos/${item.id}`, excerpt: "" }; }
    if (targetType === "demand") { const item = maps.demands.get(targetId); if (!item) return null; return { targetType, targetId, title: item.title, url: `/demands/${item.id}`, excerpt: item.content.replace(/<[^>]+>/g, "").slice(0, 100) }; }
    return null;
  }

  private async resolveInteractions(rows: { targetType: string; targetId: string; createdAt: Date }[]) {
    const maps = await this.loadTargetMaps(this.groupTargets(rows));
    return rows.map((row) => ({ target: this.targetInfo(row.targetType, row.targetId, maps), createdAt: row.createdAt })).filter((item) => item.target);
  }
}
