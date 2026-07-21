import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { IMAGE_STORAGE } from "./image-storage.interface";
import { LocalImageStorage } from "./local-image.storage";
import { S3ImageStorage } from "./s3-image.storage";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: IMAGE_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get("STORAGE_DRIVER", "local") === "s3" ? new S3ImageStorage(config) : new LocalImageStorage(config),
    },
  ],
})
export class UploadsModule {}
