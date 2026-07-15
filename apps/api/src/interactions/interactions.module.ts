import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Article } from "../database/entities/article.entity";
import { Comment } from "../database/entities/comment.entity";
import { Favorite } from "../database/entities/favorite.entity";
import { Follow } from "../database/entities/follow.entity";
import { Like } from "../database/entities/like.entity";
import { Post } from "../database/entities/post.entity";
import { User } from "../database/entities/user.entity";
import { InteractionsController } from "./interactions.controller";
import { InteractionsService } from "./interactions.service";
@Module({ imports: [AuthModule, TypeOrmModule.forFeature([Like, Favorite, Follow, Article, Post, Comment, User])], controllers: [InteractionsController], providers: [InteractionsService], exports: [InteractionsService] })
export class InteractionsModule {}
