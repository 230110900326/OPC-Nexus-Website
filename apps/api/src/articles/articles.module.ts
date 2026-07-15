import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Article } from "../database/entities/article.entity";
import { Category } from "../database/entities/category.entity";
import { Tag } from "../database/entities/tag.entity";
import { ArticleSource } from "../database/entities/article-source.entity";
import { ArticlesController } from "./articles.controller";
import { ArticlesService } from "./articles.service";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
@Module({ imports: [AuthModule, TypeOrmModule.forFeature([Article, ArticleSource, Category, Tag])], controllers: [ArticlesController, CatalogController], providers: [ArticlesService, CatalogService] })
export class ArticlesModule {}
