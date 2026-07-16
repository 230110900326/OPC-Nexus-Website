import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Article } from "../database/entities/article.entity";
import { Comment } from "../database/entities/comment.entity";
import { ModerationLog } from "../database/entities/moderation-log.entity";
import { Post } from "../database/entities/post.entity";
import { Report } from "../database/entities/report.entity";
import { User } from "../database/entities/user.entity";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { AuditModule } from "../audit/audit.module";
@Module({ imports: [AuthModule, AuditModule, NotificationsModule, TypeOrmModule.forFeature([Report, ModerationLog, Post, Comment, Article, User])], controllers: [ModerationController], providers: [ModerationService] })
export class ModerationModule {}
