import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { CreatorAccount } from "../database/entities/creator-account.entity";
import { Creator } from "../database/entities/creator.entity";
import { VideoSyncLog } from "../database/entities/video-sync-log.entity";
import { Video } from "../database/entities/video.entity";
import { VideosController } from "./videos.controller";
import { VideosService } from "./videos.service";
@Module({ imports: [AuthModule, TypeOrmModule.forFeature([Creator, CreatorAccount, Video, VideoSyncLog])], controllers: [VideosController], providers: [VideosService] }) export class VideosModule {}
