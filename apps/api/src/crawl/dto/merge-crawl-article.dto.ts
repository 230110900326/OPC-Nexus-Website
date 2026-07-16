import { IsUUID } from "class-validator";
export class MergeCrawlArticleDto { @IsUUID() targetArticleId!: string; }
