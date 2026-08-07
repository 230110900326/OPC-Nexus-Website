import { Controller, Get, Param, Res } from "@nestjs/common";
import { Response } from "express";
import { CoversService } from "./covers.service";

@Controller("covers")
export class CoversController {
  constructor(private readonly covers: CoversService) {}

  @Get(":slug")
  async cover(@Param("slug") slug: string, @Res() res: Response) {
    const svg = await this.covers.svgForSlug(slug);
    if (svg === null) {
      res.status(404).type("text/plain").send("Not Found");
      return;
    }
    // 覆盖 main.ts 全局 Cache-Control: no-store，允许浏览器缓存生成的封面
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(svg);
  }
}
