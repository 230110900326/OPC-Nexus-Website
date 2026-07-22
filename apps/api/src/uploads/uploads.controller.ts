import { Controller, Get, NotFoundException, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
<<<<<<< HEAD
=======
import { Throttle } from "@nestjs/throttler";
>>>>>>> 3d0134c839e19d4666f30bffabc3529ddc66c8bd
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { UploadedImageFile, UploadsService } from "./uploads.service";
<<<<<<< HEAD
import { Throttle } from "@nestjs/throttler";
=======
>>>>>>> 3d0134c839e19d4666f30bffabc3529ddc66c8bd

@Controller()
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}
<<<<<<< HEAD
  @Post("admin/uploads/images") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.EDITOR, SystemRole.OPERATOR, SystemRole.ADMIN) @UseInterceptors(FileInterceptor("file", { limits: { files: 1, fileSize: 5 * 1024 * 1024 } })) async upload(@UploadedFile() file?: UploadedImageFile) { return { success: true, data: await this.uploads.upload(file) }; }
  @Post("demands/uploads/images") @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 6, ttl: 60000 } }) @UseInterceptors(FileInterceptor("file", { limits: { files: 1, fileSize: 5 * 1024 * 1024 } })) async uploadDemandImage(@UploadedFile() file?: UploadedImageFile) { return { success: true, data: await this.uploads.upload(file) }; }
  @Get("uploads/:key") async local(@Param("key") key: string, @Res() response: Response) { const image = await this.uploads.read(key); if (!image) throw new NotFoundException("图片不存在"); response.setHeader("Content-Type", image.mimeType); response.setHeader("Cache-Control", "public, max-age=31536000, immutable"); response.send(image.data); }
=======

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
>>>>>>> 3d0134c839e19d4666f30bffabc3529ddc66c8bd
}
