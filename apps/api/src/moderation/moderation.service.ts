import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthUser } from "../auth/auth-user.interface";
import { Article, ArticleStatus } from "../database/entities/article.entity";
import { Comment, CommentStatus } from "../database/entities/comment.entity";
import { ModerationLog } from "../database/entities/moderation-log.entity";
import { Post, PostStatus } from "../database/entities/post.entity";
import { Report, ReportStatus, ReportTargetType } from "../database/entities/report.entity";
import { User } from "../database/entities/user.entity";
import { CreateReportDto } from "./dto/create-report.dto";
import { ListReportsDto } from "./dto/list-reports.dto";
import { ModeratePostDto } from "./dto/moderate-post.dto";
import { ResolveReportDto } from "./dto/resolve-report.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../database/entities/notification.entity";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../database/entities/audit-log.entity";
import { DemandStatus, OpcDemand } from "../database/entities/opc-demand.entity";
import { AUTOMATIC_FINANCIAL_REVIEW_REASON } from "../common/content-safety";

@Injectable()
export class ModerationService {
  constructor(@InjectRepository(Report) private readonly reports: Repository<Report>, @InjectRepository(ModerationLog) private readonly logs: Repository<ModerationLog>, @InjectRepository(Post) private readonly posts: Repository<Post>, @InjectRepository(Comment) private readonly comments: Repository<Comment>, @InjectRepository(Article) private readonly articles: Repository<Article>, @InjectRepository(User) private readonly users: Repository<User>, @InjectRepository(OpcDemand) private readonly demands: Repository<OpcDemand>, private readonly notifications: NotificationsService, private readonly audit: AuditService) {}
  async createReport(input: CreateReportDto, user: AuthUser) { await this.ensureTarget(input.targetType, input.targetId); if (await this.reports.exists({ where: { reporter: { id: user.id }, targetType: input.targetType, targetId: input.targetId, status: ReportStatus.PENDING } })) throw new ConflictException("你已举报过该内容，处理结果会在审核后更新"); const report = this.reports.create({ ...input, details: input.details?.trim() ?? null, reason: input.reason.trim(), reporter: { id: user.id } as User }); return this.reports.save(report); }
  async list(input: ListReportsDto) { const [items, total] = await this.reports.findAndCount({ where: { status: input.status }, relations: { reporter: true, handledBy: true }, order: { createdAt: "DESC" }, skip: (input.page - 1) * input.limit, take: input.limit }); const values = await Promise.all(items.map(async (report) => Object.assign(report, { targetPreview: await this.targetPreview(report.targetType, report.targetId) }))); return { items: values, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } }; }
  async resolve(id: string, input: ResolveReportDto, actor: AuthUser) {
    const report = await this.reports.findOne({ where: { id }, relations: { reporter: true } });
    if (!report) throw new NotFoundException("举报记录不存在");
    if (report.status !== ReportStatus.PENDING) throw new ConflictException("该举报已处理");
    if (input.status === ReportStatus.REJECTED && input.action !== "none") throw new BadRequestException("驳回举报时不能执行处置动作");
    const automaticReview = report.reason === AUTOMATIC_FINANCIAL_REVIEW_REASON;
    if (automaticReview && input.status === ReportStatus.RESOLVED && input.action === "none") await this.approveAutomaticReview(report);
    if (input.action === "hide") await this.hide(report.targetType, report.targetId);
    if (input.action === "ban") {
      if (report.targetType !== ReportTargetType.USER) throw new BadRequestException("封禁操作只适用于用户举报");
      await this.ban(report.targetId, input.resolution);
    }
    report.status = input.status;
    report.resolution = input.resolution.trim();
    report.handledBy = { id: actor.id } as User;
    report.handledAt = new Date();
    await this.reports.save(report);
    const action = automaticReview && input.action === "none" && input.status === ReportStatus.RESOLVED ? "approve" : input.action === "none" ? input.status : input.action;
    await this.log(actor.id, report.targetType, report.targetId, action, input.resolution, { reportId: report.id, automaticReview });
    await this.audit.record({ actor, action: AuditAction.MODERATION_REVIEW, targetType: report.targetType, targetId: report.targetId, metadata: { reportId: report.id, result: input.status, moderationAction: action, resolution: input.resolution } });
    if (input.action === "ban") await this.audit.record({ actor, action: AuditAction.USER_BAN, targetType: "user", targetId: report.targetId, metadata: { reportId: report.id, reason: input.resolution } });
    return report;
  }
  async moderatePost(id: string, input: ModeratePostDto, actor: AuthUser) { const post = await this.posts.findOne({ where: { id }, relations: { author: true } }); if (!post) throw new NotFoundException("帖子不存在"); switch (input.action) { case "hide": post.status = PostStatus.HIDDEN; break; case "restore": post.status = PostStatus.PUBLISHED; break; case "lock": post.isLocked = true; break; case "unlock": post.isLocked = false; break; case "pin": post.isPinned = true; break; case "unpin": post.isPinned = false; break; case "feature": post.isFeatured = true; break; case "unfeature": post.isFeatured = false; break; } await this.posts.save(post); await this.log(actor.id, "post", id, input.action, input.reason); await this.audit.record({ actor, action: AuditAction.MODERATION_REVIEW, targetType: "post", targetId: id, metadata: { moderationAction: input.action, reason: input.reason } }); await this.notifications.create(post.author.id, NotificationType.CONTENT_MODERATED, "社区内容状态更新", `你的帖子“${post.title}”已被管理团队${input.action}。${input.reason}`, "post", post.id); return post; }
  async listLogs(page = 1, limit = 30) { const [items, total] = await this.logs.findAndCount({ relations: { operator: true }, order: { createdAt: "DESC" }, skip: (page - 1) * limit, take: limit }); return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }; }
  private async approveAutomaticReview(report: Report) {
    if (report.targetType === ReportTargetType.POST) {
      const post = await this.posts.findOne({ where: { id: report.targetId }, relations: { author: true } });
      if (!post || post.status !== PostStatus.REVIEW) throw new ConflictException("帖子已不在待审核状态");
      post.status = PostStatus.PUBLISHED;
      await this.posts.save(post);
      await this.notifications.create(post.author.id, NotificationType.CONTENT_MODERATED, "社区内容审核通过", `你的帖子“${post.title}”已通过人工审核并公开。`, "post", post.id);
      return;
    }
    if (report.targetType === ReportTargetType.COMMENT) {
      const comment = await this.comments.findOne({ where: { id: report.targetId }, relations: { author: true, post: true } });
      if (!comment || comment.status !== CommentStatus.REVIEW) throw new ConflictException("评论已不在待审核状态");
      comment.status = CommentStatus.PUBLISHED;
      await Promise.all([this.comments.save(comment), this.posts.increment({ id: comment.post.id }, "commentCount", 1)]);
      await this.notifications.create(comment.author.id, NotificationType.CONTENT_MODERATED, "社区评论审核通过", "你的评论已通过人工审核并公开。", "post", comment.post.id);
      return;
    }
    throw new BadRequestException("该内容不属于自动审核队列");
  }
  private async ensureTarget(type: ReportTargetType, id: string) { const exists = type === ReportTargetType.POST ? await this.posts.exists({ where: { id } }) : type === ReportTargetType.COMMENT ? await this.comments.exists({ where: { id } }) : type === ReportTargetType.ARTICLE ? await this.articles.exists({ where: { id } }) : type === ReportTargetType.DEMAND ? await this.demands.exists({ where: { id } }) : await this.users.exists({ where: { id } }); if (!exists) throw new NotFoundException("举报目标不存在"); }
  private async targetPreview(type: ReportTargetType, id: string) { if (type === ReportTargetType.POST) { const post = await this.posts.findOne({ where: { id }, withDeleted: true }); return post ? { title: post.title, excerpt: post.body.slice(0, 240) } : null; } if (type === ReportTargetType.COMMENT) { const comment = await this.comments.findOne({ where: { id }, relations: { post: true } }); return comment ? { title: "评论", excerpt: comment.body.slice(0, 240), postId: comment.post.id } : null; } if (type === ReportTargetType.ARTICLE) { const article = await this.articles.findOneBy({ id }); return article ? { title: article.title, excerpt: article.summary.slice(0, 240) } : null; } if (type === ReportTargetType.DEMAND) { const demand = await this.demands.findOne({ where: { id }, withDeleted: true }); return demand ? { title: demand.title, excerpt: demand.content.slice(0, 240), demandId: demand.id } : null; } const user = await this.users.findOneBy({ id }); return user ? { title: user.displayName, excerpt: [user.company, user.jobTitle, user.industry].filter(Boolean).join(" · ") } : null; }
  private async hide(type: ReportTargetType, id: string) { if (type === ReportTargetType.POST) await this.posts.update(id, { status: PostStatus.HIDDEN }); else if (type === ReportTargetType.COMMENT) await this.comments.update(id, { status: CommentStatus.HIDDEN }); else if (type === ReportTargetType.ARTICLE) await this.articles.update(id, { status: ArticleStatus.OFFLINE }); else if (type === ReportTargetType.DEMAND) { const demand = await this.demands.findOne({ where: { id }, relations: { author: true } }); if (!demand) throw new NotFoundException("需求不存在"); demand.status = DemandStatus.OFFLINE; demand.topWeight = 0; await this.demands.save(demand); await this.notifications.create(demand.author.id, NotificationType.DEMAND_MODERATED, "需求因举报被下架", `你的需求“${demand.title}”已由审核团队下架，请查看平台规范。`, "demand", demand.id); } else throw new BadRequestException("用户举报请使用封禁操作"); }
  private async ban(id: string, reason: string) { const result = await this.users.update(id, { isActive: false, banReason: reason.trim(), bannedAt: new Date(), refreshTokenHash: null }); if (!result.affected) throw new NotFoundException("用户不存在"); }
  private async log(operatorId: string, targetType: string, targetId: string, action: string, reason: string, metadata: Record<string, unknown> = {}) { await this.logs.save(this.logs.create({ operator: { id: operatorId } as User, targetType, targetId, action, reason: reason.trim(), metadata })); }
}
