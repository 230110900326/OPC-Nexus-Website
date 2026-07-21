import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import * as Joi from "joi";
import { AuthModule } from "./auth/auth.module";
import { Permission } from "./database/entities/permission.entity";
import { Role } from "./database/entities/role.entity";
import { User } from "./database/entities/user.entity";
import { HealthController } from "./health/health.controller";
import { UsersModule } from "./users/users.module";
import { Category } from "./database/entities/category.entity";
import { Tag } from "./database/entities/tag.entity";
import { Article } from "./database/entities/article.entity";
import { ArticleSource } from "./database/entities/article-source.entity";
import { ArticlesModule } from "./articles/articles.module";
import { UploadsModule } from "./uploads/uploads.module";
import { SearchModule } from "./search/search.module";
import { Comment } from "./database/entities/comment.entity";
import { Favorite } from "./database/entities/favorite.entity";
import { Follow } from "./database/entities/follow.entity";
import { ForumSection } from "./database/entities/forum-section.entity";
import { Like } from "./database/entities/like.entity";
import { ModerationLog } from "./database/entities/moderation-log.entity";
import { Post } from "./database/entities/post.entity";
import { Report } from "./database/entities/report.entity";
import { ForumModule } from "./forum/forum.module";
import { InteractionsModule } from "./interactions/interactions.module";
import { ModerationModule } from "./moderation/moderation.module";
import { Event } from "./database/entities/event.entity";
import { EventRegistration } from "./database/entities/event-registration.entity";
import { Notification } from "./database/entities/notification.entity";
import { EventsModule } from "./events/events.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { CrawlSource } from "./database/entities/crawl-source.entity";
import { CrawlJob } from "./database/entities/crawl-job.entity";
import { CrawlLog } from "./database/entities/crawl-log.entity";
import { CrawlModule } from "./crawl/crawl.module";
import { ContentKeyword } from "./database/entities/content-keyword.entity";
import { CrawlDiscovery } from "./database/entities/crawl-discovery.entity";
import { LinkCheck } from "./database/entities/link-check.entity";
import { Creator } from "./database/entities/creator.entity";
import { CreatorAccount } from "./database/entities/creator-account.entity";
import { Video } from "./database/entities/video.entity";
import { VideoSyncLog } from "./database/entities/video-sync-log.entity";
import { VideosModule } from "./videos/videos.module";
import { ContentMetric } from "./database/entities/content-metric.entity";
import { InteractionAudit } from "./database/entities/interaction-audit.entity";
import { RankingModule } from "./ranking/ranking.module";
import { AuditLog } from "./database/entities/audit-log.entity";
import { HomepageConfig } from "./database/entities/homepage-config.entity";
import { RecommendationEvent } from "./database/entities/recommendation-event.entity";
import { AuditModule } from "./audit/audit.module";
import { OperationsModule } from "./operations/operations.module";
import { DemandBoardConfig } from "./database/entities/demand-board-config.entity";
import { OpcDemandConnect } from "./database/entities/opc-demand-connect.entity";
import { OpcDemand } from "./database/entities/opc-demand.entity";
import { DemandsModule } from "./demands/demands.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        API_PORT: Joi.number().port().default(4000), WEB_ORIGIN: Joi.string().uri().default("http://localhost:3000"),
        DB_HOST: Joi.string().hostname().default("localhost"), DB_PORT: Joi.number().port().default(5432),
        DB_NAME: Joi.string().default("opc_nexus"), DB_USER: Joi.string().default("opc"), DB_PASSWORD: Joi.string().min(1).required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(), JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_TTL: Joi.string().default("15m"), JWT_REFRESH_TTL: Joi.string().default("7d"),
        COOKIE_SECURE: Joi.boolean().optional(), REFRESH_COOKIE_PATH: Joi.string().pattern(/^\/.*/).default("/"),
        API_PUBLIC_URL: Joi.string().uri().default("http://localhost:4000"), STORAGE_DRIVER: Joi.string().valid("local", "s3").default("local"), UPLOAD_DIR: Joi.string().default("uploads"),
        S3_ENDPOINT: Joi.string().uri().when("STORAGE_DRIVER", { is: "s3", then: Joi.required() }), S3_REGION: Joi.string().default("auto"), S3_BUCKET: Joi.string().when("STORAGE_DRIVER", { is: "s3", then: Joi.required() }), S3_ACCESS_KEY_ID: Joi.string().when("STORAGE_DRIVER", { is: "s3", then: Joi.required() }), S3_SECRET_ACCESS_KEY: Joi.string().when("STORAGE_DRIVER", { is: "s3", then: Joi.required() }), S3_PUBLIC_BASE_URL: Joi.string().uri().optional(),
        SMTP_HOST: Joi.string().hostname().optional(), SMTP_PORT: Joi.number().port().optional(), SMTP_USER: Joi.string().optional(), SMTP_PASS: Joi.string().optional(), SMTP_FROM: Joi.string().optional(),
        CRAWLER_API_TOKEN: Joi.string().min(32).optional(), CRAWLER_SERVICE_URL: Joi.string().uri().optional(),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRoot({
      type: "postgres", host: process.env.DB_HOST, port: Number(process.env.DB_PORT), username: process.env.DB_USER,
      password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [User, Role, Permission, Category, Tag, Article, ArticleSource, ForumSection, Post, Comment, Like, Favorite, Follow, Report, ModerationLog, Event, EventRegistration, Notification, CrawlSource, CrawlJob, CrawlLog, ContentKeyword, CrawlDiscovery, LinkCheck, Creator, CreatorAccount, Video, VideoSyncLog, ContentMetric, InteractionAudit, HomepageConfig, RecommendationEvent, AuditLog, OpcDemand, OpcDemandConnect, DemandBoardConfig], synchronize: false,
    }),
    AuditModule,
    AuthModule,
    UsersModule,
    ArticlesModule,
    UploadsModule,
    SearchModule,
    ForumModule,
    InteractionsModule,
    ModerationModule,
    NotificationsModule,
    EventsModule,
    CrawlModule,
    VideosModule,
    RankingModule,
    OperationsModule,
    DemandsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
