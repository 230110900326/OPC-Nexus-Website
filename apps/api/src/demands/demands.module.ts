import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { DemandBoardConfig } from "../database/entities/demand-board-config.entity";
import { ForumSection } from "../database/entities/forum-section.entity";
import { ModerationLog } from "../database/entities/moderation-log.entity";
import { OpcDemandConnect } from "../database/entities/opc-demand-connect.entity";
import { OpcDemand } from "../database/entities/opc-demand.entity";
import { Report } from "../database/entities/report.entity";
import { User } from "../database/entities/user.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { RankingModule } from "../ranking/ranking.module";
import { DemandAdminService } from "./demand-admin.service";
import { DemandComplianceService } from "./demand-compliance.service";
import { DemandHeatService } from "./demand-heat.service";
import { DemandsController } from "./demands.controller";
import { DemandsService } from "./demands.service";

@Module({
  imports: [AuthModule, NotificationsModule, RankingModule, TypeOrmModule.forFeature([OpcDemand, OpcDemandConnect, DemandBoardConfig, ForumSection, User, ModerationLog, Report])],
  controllers: [DemandsController],
  providers: [DemandsService, DemandAdminService, DemandComplianceService, DemandHeatService],
  exports: [DemandsService, DemandAdminService, DemandComplianceService, DemandHeatService],
})
export class DemandsModule {}
