import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CrawlerRuntimeService } from "./crawler-runtime.service";
import { CrawlerTokenGuard } from "./crawler-token.guard";
import { CrawlerRunDto } from "./dto/crawler-run.dto";

@Controller("internal/crawler")
@UseGuards(CrawlerTokenGuard)
export class CrawlerInternalController {
  constructor(private readonly runtime: CrawlerRuntimeService) {}

  @Get("sources")
  async sources() { return { success: true, data: await this.runtime.readySources() }; }

  @Post("runs")
  async run(@Body() input: CrawlerRunDto) { return { success: true, data: await this.runtime.recordRun(input) }; }
}
