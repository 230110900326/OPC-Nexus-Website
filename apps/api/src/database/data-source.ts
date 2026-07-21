import "reflect-metadata";
import { DataSource } from "typeorm";
import { Permission } from "./entities/permission.entity";
import { Role } from "./entities/role.entity";
import { User } from "./entities/user.entity";
import { InitialAccountSchema1710000000000 } from "./migrations/1710000000000-initial-account-schema";
import { ContentSchema1710000001000 } from "./migrations/1710000001000-content-schema";
import { ContentCompletion1710000002000 } from "./migrations/1710000002000-content-completion";
import { CommunitySchema1710000003000 } from "./migrations/1710000003000-community-schema";
import { EventsNotifications1710000004000 } from "./migrations/1710000004000-events-notifications";
import { CrawlSources1710000005000 } from "./migrations/1710000005000-crawl-sources";
import { CrawlProcessing1710000006000 } from "./migrations/1710000006000-crawl-processing";
import { VideoSchema1710000007000 } from "./migrations/1710000007000-video-schema";
import { RankingSchema1710000008000 } from "./migrations/1710000008000-ranking-schema";
import { OperationsSchema1710000009000 } from "./migrations/1710000009000-operations-schema";
import { Category } from "./entities/category.entity";
import { Tag } from "./entities/tag.entity";
import { Article } from "./entities/article.entity";
import { ArticleSource } from "./entities/article-source.entity";
import { Comment } from "./entities/comment.entity";
import { Favorite } from "./entities/favorite.entity";
import { Follow } from "./entities/follow.entity";
import { ForumSection } from "./entities/forum-section.entity";
import { Like } from "./entities/like.entity";
import { ModerationLog } from "./entities/moderation-log.entity";
import { Post } from "./entities/post.entity";
import { Report } from "./entities/report.entity";
import { Event } from "./entities/event.entity";
import { EventRegistration } from "./entities/event-registration.entity";
import { Notification } from "./entities/notification.entity";
import { CrawlSource } from "./entities/crawl-source.entity";
import { CrawlJob } from "./entities/crawl-job.entity";
import { CrawlLog } from "./entities/crawl-log.entity";
import { ContentKeyword } from "./entities/content-keyword.entity";
import { CrawlDiscovery } from "./entities/crawl-discovery.entity";
import { LinkCheck } from "./entities/link-check.entity";
import { Creator } from "./entities/creator.entity";
import { CreatorAccount } from "./entities/creator-account.entity";
import { Video } from "./entities/video.entity";
import { VideoSyncLog } from "./entities/video-sync-log.entity";
import { ContentMetric } from "./entities/content-metric.entity";
import { InteractionAudit } from "./entities/interaction-audit.entity";
import { AuditLog } from "./entities/audit-log.entity";
import { HomepageConfig } from "./entities/homepage-config.entity";
import { RecommendationEvent } from "./entities/recommendation-event.entity";
import { DemandBoardConfig } from "./entities/demand-board-config.entity";
import { OpcDemandConnect } from "./entities/opc-demand-connect.entity";
import { OpcDemand } from "./entities/opc-demand.entity";
import { DemandMarketplace1710000010000 } from "./migrations/1710000010000-demand-marketplace";
import { PasswordReset1710000020000 } from "./migrations/1710000020000-password-reset";
import { CrawlerRuntime1710000021000 } from "./migrations/1710000021000-crawler-runtime";
import { ZntIntelligence1710000022000 } from "./migrations/1710000022000-znt-intelligence";

export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? "opc",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? "opc_nexus",
  entities: [User, Role, Permission, Category, Tag, Article, ArticleSource, ForumSection, Post, Comment, Like, Favorite, Follow, Report, ModerationLog, Event, EventRegistration, Notification, CrawlSource, CrawlJob, CrawlLog, ContentKeyword, CrawlDiscovery, LinkCheck, Creator, CreatorAccount, Video, VideoSyncLog, ContentMetric, InteractionAudit, HomepageConfig, RecommendationEvent, AuditLog, OpcDemand, OpcDemandConnect, DemandBoardConfig],
  migrations: [InitialAccountSchema1710000000000, ContentSchema1710000001000, ContentCompletion1710000002000, CommunitySchema1710000003000, EventsNotifications1710000004000, CrawlSources1710000005000, CrawlProcessing1710000006000, VideoSchema1710000007000, RankingSchema1710000008000, OperationsSchema1710000009000, DemandMarketplace1710000010000, PasswordReset1710000020000, CrawlerRuntime1710000021000, ZntIntelligence1710000022000],
  synchronize: false,
});
