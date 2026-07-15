import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { CreatePostDto } from "./dto/create-post.dto";
import { ListPostsDto } from "./dto/list-posts.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { ForumService } from "./forum.service";

@Controller("forum")
export class ForumController {
  constructor(private readonly forum: ForumService) {}
  @Get("sections") async sections() { return { success: true, data: await this.forum.listSections() }; }
  @Get("posts") async posts(@Query() query: ListPostsDto) { return { success: true, data: await this.forum.listPosts(query) }; }
  @Get("posts/:id") async detail(@Param("id", ParseUUIDPipe) id: string) { return { success: true, data: await this.forum.detail(id) }; }
  @Get("me/posts") @UseGuards(JwtAuthGuard) async mine(@Query() query: ListPostsDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.forum.listPosts(query, user.id) }; }
  @Get("me/posts/:id") @UseGuards(JwtAuthGuard) async mineDetail(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.forum.ownerDetail(id, user) }; }
  @Post("posts") @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 3, ttl: 60000 } }) async create(@Body() input: CreatePostDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.forum.create(input, user) }; }
  @Patch("posts/:id") @UseGuards(JwtAuthGuard) async update(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdatePostDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.forum.update(id, input, user) }; }
  @Delete("posts/:id") @UseGuards(JwtAuthGuard) async remove(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.forum.remove(id, user) }; }
  @Post("posts/:id/comments") @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 10, ttl: 60000 } }) async comment(@Param("id", ParseUUIDPipe) id: string, @Body() input: CreateCommentDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.forum.createComment(id, input, user) }; }
  @Patch("comments/:id") @UseGuards(JwtAuthGuard) async updateComment(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateCommentDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.forum.updateComment(id, input, user) }; }
  @Delete("comments/:id") @UseGuards(JwtAuthGuard) async removeComment(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.forum.removeComment(id, user) }; }
}
