import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Article } from "../database/entities/article.entity";
import { CoversController } from "./covers.controller";
import { CoversService } from "./covers.service";

@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  controllers: [CoversController],
  providers: [CoversService],
})
export class CoversModule {}
