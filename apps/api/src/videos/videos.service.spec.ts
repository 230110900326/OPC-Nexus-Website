import { BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { CreatorAccount } from "../database/entities/creator-account.entity";
import { Creator, AuthorizationStatus } from "../database/entities/creator.entity";
import { SubtitleStatus, Video } from "../database/entities/video.entity";
import { VideoSyncLog } from "../database/entities/video-sync-log.entity";
import { VideosService } from "./videos.service";
describe("VideosService", () => { const creators = {} as Repository<Creator>; const accounts = {} as Repository<CreatorAccount>; const videos = { findOne: jest.fn() } as unknown as Repository<Video>; const logs = {} as Repository<VideoSyncLog>; const service = new VideosService(creators, accounts, videos, logs); beforeEach(() => jest.clearAllMocks()); it("blocks subtitle processing before authorization", async () => { (videos.findOne as jest.Mock).mockResolvedValue({ id: "v", subtitleStatus: SubtitleStatus.NOT_FETCHED }); await expect(service.updateSubtitle("v", { status: SubtitleStatus.PROCESSING })).rejects.toBeInstanceOf(BadRequestException); }); it("does not generate a summary without legal transcript", async () => { (videos.findOne as jest.Mock).mockResolvedValue({ id: "v", subtitleStatus: SubtitleStatus.PROCESSING }); await expect(service.updateSubtitle("v", { status: SubtitleStatus.COMPLETED })).rejects.toBeInstanceOf(BadRequestException); }); });
