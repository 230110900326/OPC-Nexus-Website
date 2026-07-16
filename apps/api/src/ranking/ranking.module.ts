import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Article } from "../database/entities/article.entity";
import { ContentMetric } from "../database/entities/content-metric.entity";
import { Follow } from "../database/entities/follow.entity";
import { InteractionAudit } from "../database/entities/interaction-audit.entity";
import { Post } from "../database/entities/post.entity";
import { User } from "../database/entities/user.entity";
import { Video } from "../database/entities/video.entity";
import { InteractionRiskService } from "./interaction-risk.service";
import { RankingController } from "./ranking.controller";
import { RankingService } from "./ranking.service";
import { AuditModule } from "../audit/audit.module";
import { OpcDemand } from "../database/entities/opc-demand.entity";
@Module({ imports: [AuthModule, AuditModule, TypeOrmModule.forFeature([ContentMetric, InteractionAudit, Article, Video, Post, OpcDemand, Follow, User])], controllers: [RankingController], providers: [RankingService, InteractionRiskService], exports: [RankingService, InteractionRiskService] }) export class RankingModule {}
