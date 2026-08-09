import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateCommentDto } from "../forum/dto/create-comment.dto";
import { UpdateCommentDto } from "../forum/dto/update-comment.dto";
import { InteractionsService } from "./interactions.service";

/** 文章/视频内容评论。帖子评论沿用论坛模块（/forum/posts/:id/comments）。
    路由前缀用 content/comments，避免与论坛的 PATCH/DELETE /comments/:id 冲突。 */
@Controller("content/comments")
export class CommentsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Get(":targetType/:targetId")
  async list(@Param("targetType") targetType: string, @Param("targetId", ParseUUIDPipe) targetId: string) {
    return { success: true, data: await this.interactions.contentComments(targetType, targetId) };
  }

  @Post(":targetType/:targetId")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@AuthenticatedUser() user: AuthUser, @Param("targetType") targetType: string, @Param("targetId", ParseUUIDPipe) targetId: string, @Body() input: CreateCommentDto) {
    return { success: true, data: await this.interactions.createContentComment(targetType, targetId, input, user) };
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  async update(@AuthenticatedUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateCommentDto) {
    return { success: true, data: await this.interactions.updateContentComment(id, input, user) };
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async remove(@AuthenticatedUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return { success: true, data: await this.interactions.removeContentComment(id, user) };
  }
}
