import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { CrawlSource } from "../database/entities/crawl-source.entity";
import { CrawlJob } from "../database/entities/crawl-job.entity";
import { CrawlLog } from "../database/entities/crawl-log.entity";
import { Article } from "../database/entities/article.entity";
import { ArticleSource } from "../database/entities/article-source.entity";
import { ContentKeyword } from "../database/entities/content-keyword.entity";
import { CrawlDiscovery } from "../database/entities/crawl-discovery.entity";
import { LinkCheck } from "../database/entities/link-check.entity";
import { CrawlProcessingService } from "./crawl-processing.service";
import { CrawlController } from "./crawl.controller";
import { CrawlService } from "./crawl.service";
@Module({ imports: [AuthModule, TypeOrmModule.forFeature([CrawlSource, CrawlJob, CrawlLog, CrawlDiscovery, Article, ArticleSource, ContentKeyword, LinkCheck])], controllers: [CrawlController], providers: [CrawlService, CrawlProcessingService] }) export class CrawlModule {}
