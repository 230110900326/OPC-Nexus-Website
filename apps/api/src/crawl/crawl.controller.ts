import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { CrawlService, OPC_PRIORITY_KEYWORDS } from "./crawl.service";
import { CreateCrawlSourceDto } from "./dto/create-crawl-source.dto";
import { ListCrawlSourcesDto } from "./dto/list-crawl-sources.dto";
import { UpdateCrawlSourceDto } from "./dto/update-crawl-source.dto";
import { CrawlProcessingService } from "./crawl-processing.service";
import { IngestCrawlArticleDto } from "./dto/ingest-crawl-article.dto";
import { MergeCrawlArticleDto } from "./dto/merge-crawl-article.dto";
import { RecordLinkCheckDto } from "./dto/record-link-check.dto";
@Controller("admin/crawl-sources") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.ADMIN, SystemRole.OPERATOR, SystemRole.EDITOR)
export class CrawlController { constructor(private readonly crawl: CrawlService, private readonly processing: CrawlProcessingService) {} @Get() list(@Query() query: ListCrawlSourcesDto) { return this.crawl.list(query).then((data) => ({ success: true, data })); } @Get("keywords") keywords() { return { success: true, data: OPC_PRIORITY_KEYWORDS }; } @Get("jobs") jobs(@Query("sourceId") sourceId?: string) { return this.crawl.listJobs(sourceId).then((data) => ({ success: true, data })); } @Get("jobs/:id/logs") logs(@Param("id", ParseUUIDPipe) id: string) { return this.crawl.listLogs(id).then((data) => ({ success: true, data })); } @Post() create(@Body() input: CreateCrawlSourceDto) { return this.crawl.create(input).then((data) => ({ success: true, data })); } @Patch(":id") update(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateCrawlSourceDto) { return this.crawl.update(id, input).then((data) => ({ success: true, data })); } @Get("review/queue") queue() { return this.processing.reviewQueue().then((data) => ({ success: true, data })); } @Post("review/ingest") ingest(@Body() input: IngestCrawlArticleDto) { return this.processing.ingest(input).then((data) => ({ success: true, data })); } @Post("review/:id/reject") reject(@Param("id", ParseUUIDPipe) id: string) { return this.processing.reject(id).then((data) => ({ success: true, data })); } @Post("review/:id/merge") merge(@Param("id", ParseUUIDPipe) id: string, @Body() input: MergeCrawlArticleDto) { return this.processing.merge(id, input.targetArticleId).then((data) => ({ success: true, data })); } @Post("review/:id/link-check") linkCheck(@Param("id", ParseUUIDPipe) id: string, @Body() input: RecordLinkCheckDto) { return this.processing.recordLinkCheck(id, input.statusCode ?? null, input.redirectUrl, input.errorMessage).then((data) => ({ success: true, data })); } }
