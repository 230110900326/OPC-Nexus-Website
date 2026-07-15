import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Comment } from "../database/entities/comment.entity";
import { ForumSection } from "../database/entities/forum-section.entity";
import { Post } from "../database/entities/post.entity";
import { ForumController } from "./forum.controller";
import { ForumService } from "./forum.service";
import { NotificationsModule } from "../notifications/notifications.module";
@Module({ imports: [AuthModule, NotificationsModule, TypeOrmModule.forFeature([ForumSection, Post, Comment])], controllers: [ForumController], providers: [ForumService], exports: [ForumService] })
export class ForumModule {}
