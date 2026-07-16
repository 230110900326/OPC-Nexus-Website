import { IsEnum, IsOptional, IsString } from "class-validator";
import { CrawlAuthorizationStatus, CrawlSourceType } from "../../database/entities/crawl-source.entity";
export class ListCrawlSourcesDto { @IsOptional() @IsEnum(CrawlSourceType) type?: CrawlSourceType; @IsOptional() @IsEnum(CrawlAuthorizationStatus) authorizationStatus?: CrawlAuthorizationStatus; @IsOptional() @IsString() keyword?: string; }
