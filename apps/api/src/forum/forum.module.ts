import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Comment } from "../database/entities/comment.entity";
import { ForumSection } from "../database/entities/forum-section.entity";
import { Post } from "../database/entities/post.entity";
import { ForumController } from "./forum.controller";
import { ForumService } from "./forum.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { RankingModule } from "../ranking/ranking.module";
import { Report } from "../database/entities/report.entity";
@Module({ imports: [AuthModule, NotificationsModule, RankingModule, TypeOrmModule.forFeature([ForumSection, Post, Comment, Report])], controllers: [ForumController], providers: [ForumService], exports: [ForumService] })
export class ForumModule {}
