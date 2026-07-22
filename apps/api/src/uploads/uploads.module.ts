import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { IMAGE_STORAGE } from "./image-storage.interface";
import { LocalImageStorage } from "./local-image.storage";
import { S3ImageStorage } from "./s3-image.storage";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";

<<<<<<< HEAD
@Module({ imports: [AuthModule], controllers: [UploadsController], providers: [UploadsService, { provide: IMAGE_STORAGE, inject: [ConfigService], useFactory: (config: ConfigService) => config.get("STORAGE_DRIVER", "local") === "s3" ? new S3ImageStorage(config) : new LocalImageStorage(config) }] })
=======
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
>>>>>>> 3d0134c839e19d4666f30bffabc3529ddc66c8bd
export class UploadsModule {}
