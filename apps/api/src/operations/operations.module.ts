import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { Creator } from "../database/entities/creator.entity";
import { EventRegistration } from "../database/entities/event-registration.entity";
import { Event } from "../database/entities/event.entity";
import { HomepageConfig } from "../database/entities/homepage-config.entity";
import { RecommendationEvent } from "../database/entities/recommendation-event.entity";
import { RankingModule } from "../ranking/ranking.module";
import { HomepageConfigService } from "./homepage-config.service";
import { HomepageService } from "./homepage.service";
import { OperationsDashboardService } from "./operations-dashboard.service";
import { OperationsController } from "./operations.controller";

@Module({
  imports: [AuthModule, AuditModule, RankingModule, TypeOrmModule.forFeature([HomepageConfig, RecommendationEvent, Event, EventRegistration, Creator])],
  controllers: [OperationsController],
  providers: [HomepageService, HomepageConfigService, OperationsDashboardService],
  exports: [HomepageService, HomepageConfigService, OperationsDashboardService],
})
export class OperationsModule {}
