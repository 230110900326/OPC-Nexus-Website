import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Article } from "../database/entities/article.entity";
import { Post } from "../database/entities/post.entity";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
@Module({ imports: [TypeOrmModule.forFeature([Article, Post])], controllers: [SearchController], providers: [SearchService] })
export class SearchModule {}
