import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Article } from "../database/entities/article.entity";
import { ContentFormattingService } from "./content-formatting.service";
import { ContentFormattingController } from "./content-formatting.controller";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Article])],
  controllers: [ContentFormattingController],
  providers: [ContentFormattingService],
  exports: [ContentFormattingService],
})
export class ContentFormattingModule {}
