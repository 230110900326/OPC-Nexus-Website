import { Controller, Get, NotFoundException, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { UploadedImageFile, UploadsService } from "./uploads.service";

@Controller()
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post("admin/uploads/images")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.EDITOR, SystemRole.OPERATOR, SystemRole.ADMIN)
  @UseInterceptors(FileInterceptor("file", { limits: { files: 1, fileSize: 5 * 1024 * 1024 } }))
  async upload(@UploadedFile() file?: UploadedImageFile) {
    return { success: true, data: await this.uploads.upload(file) };
  }

  @Post("demands/uploads/images")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("file", { limits: { files: 1, fileSize: 5 * 1024 * 1024 } }))
  async uploadDemandImage(@UploadedFile() file?: UploadedImageFile) {
    return { success: true, data: await this.uploads.upload(file) };
  }

  @Get("uploads/:key")
  async local(@Param("key") key: string, @Res() response: Response) {
    const image = await this.uploads.read(key);
    if (!image) throw new NotFoundException("图片不存在");
    response.setHeader("Content-Type", image.mimeType);
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    response.send(image.data);
  }
}
