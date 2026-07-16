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
import { Video } from "../database/entities/video.entity";
import { Creator } from "../database/entities/creator.entity";
import { RankingModule } from "../ranking/ranking.module";
import { InteractionsController } from "./interactions.controller";
import { InteractionsService } from "./interactions.service";
@Module({ imports: [AuthModule, RankingModule, TypeOrmModule.forFeature([Like, Favorite, Follow, Article, Post, Comment, User, Video, Creator])], controllers: [InteractionsController], providers: [InteractionsService], exports: [InteractionsService] })
export class InteractionsModule {}
