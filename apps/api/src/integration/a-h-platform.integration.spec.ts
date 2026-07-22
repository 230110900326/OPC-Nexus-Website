import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Repository } from "typeorm";
import { Article, ArticleStatus, ArticleType } from "../database/entities/article.entity";
import { ContentMetric, MetricContentType, MetricSource } from "../database/entities/content-metric.entity";
import { Follow } from "../database/entities/follow.entity";
import { Notification, NotificationType } from "../database/entities/notification.entity";
import { Post, PostStatus } from "../database/entities/post.entity";
import { SystemRole } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { SubtitleStatus, Video } from "../database/entities/video.entity";
import { HealthController } from "../health/health.controller";
import { NotificationsService } from "../notifications/notifications.service";
import { FeedMode, RankScope, RankWindow } from "../ranking/dto/feed-query.dto";
import { RankingService } from "../ranking/ranking.service";
import { RolesGuard } from "../auth/roles.guard";
import { OpcDemand } from "../database/entities/opc-demand.entity";

describe("A-H platform integration", () => {
  it("passes foundation and authorization checks before content aggregation", () => { expect(new HealthController({} as never).check().data.status).toBe("ok"); const reflector = { getAllAndOverride: jest.fn().mockReturnValue([SystemRole.EDITOR]) } as unknown as Reflector; const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { roles: [SystemRole.EDITOR] } }) }) } as unknown as ExecutionContext; expect(new RolesGuard(reflector).canActivate(context)).toBe(true); });
  it("combines classified articles, community posts and authorized videos into one ranked feed and emits a notification", async () => {
    const now = new Date(); const article = { id: "11111111-1111-4111-8111-111111111111", type: ArticleType.NEWS, status: ArticleStatus.PUBLISHED, slug: "opc-company", title: "OPC 一人公司政策观察", summary: "采集、分类和审核后的文章", coverImageUrl: null, classification: { "OPC与个体经济": 1 }, publishedAt: now, createdAt: now, category: { name: "创业" }, sources: [{ name: "授权测试源" }], operator: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } as unknown as Article;
    const post = { id: "22222222-2222-4222-8222-222222222222", status: PostStatus.PUBLISHED, title: "超级个体如何管理现金流", body: "社区讨论正文", createdAt: now, author: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", displayName: "社区用户" }, section: { name: "创业与投资" } } as Post;
    const video = { id: "33333333-3333-4333-8333-333333333333", isPublished: true, title: "OPC 财经视频", contentSummary: "根据合法字幕生成的概要", platformDescription: "", coverUrl: null, originalUrl: "https://video.test/1", subtitleStatus: SubtitleStatus.COMPLETED, industryTags: ["OPC与个体经济"], platformMetrics: { views: 2000, likes: 100 }, publishedAt: now, createdAt: now, creatorAccount: { creator: { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "授权创作者", industries: ["财经"], trustLevel: 5 } } } as unknown as Video;
    const metrics = { findOne: jest.fn(async ({ where }: { where: { contentId: string } }) => ({ contentType: where.contentId === video.id ? MetricContentType.VIDEO : where.contentId === post.id ? MetricContentType.POST : MetricContentType.ARTICLE, contentId: where.contentId, source: MetricSource.INTERNAL, likeCount: where.contentId === article.id ? 20 : 5, commentCount: 3, favoriteCount: 2, shareCount: 1, readCount: 200, externalViewCount: where.contentId === video.id ? 2000 : 0, externalLikeCount: where.contentId === video.id ? 100 : 0, sourceTrust: .8, editorScore: .5 })) } as unknown as Repository<ContentMetric>;
    const ranking = new RankingService(metrics, { find: jest.fn().mockResolvedValue([article]) } as unknown as Repository<Article>, { find: jest.fn().mockResolvedValue([video]) } as unknown as Repository<Video>, { find: jest.fn().mockResolvedValue([post]) } as unknown as Repository<Post>, { find: jest.fn().mockResolvedValue([]) } as unknown as Repository<OpcDemand>, { find: jest.fn().mockResolvedValue([]) } as unknown as Repository<Follow>, { findOneBy: jest.fn().mockResolvedValue(null) } as unknown as Repository<User>);
    const feed = await ranking.feed({ mode: FeedMode.RECOMMENDED, scope: RankScope.ALL, window: RankWindow.WEEK }); expect(feed.map((item) => item.contentType).sort()).toEqual(["article", "post", "video"]); expect(feed.every((item) => item.heat >= 0 && item.reason.length > 0)).toBe(true); expect(feed.find((item) => item.id === article.id)?.reason).toContain("OPC");
    const notificationRepository = { create: jest.fn((value) => value), save: jest.fn(async (value) => value) } as unknown as Repository<Notification>; await new NotificationsService(notificationRepository).create("dddddddd-dddd-4ddd-8ddd-dddddddddddd", NotificationType.FOLLOWED_AUTHOR_UPDATE, "关注内容更新", feed[0].title, feed[0].contentType, feed[0].id); expect(notificationRepository.save).toHaveBeenCalled();
  });
});
