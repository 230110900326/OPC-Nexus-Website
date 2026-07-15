import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { ArticlesService } from "./articles.service";
import { CreateArticleDto } from "./dto/create-article.dto";
import { ListArticlesDto } from "./dto/list-articles.dto";
import { UpdateArticleDto } from "./dto/update-article.dto";

const editors = [SystemRole.EDITOR, SystemRole.OPERATOR, SystemRole.ADMIN];
const publishers = [SystemRole.OPERATOR, SystemRole.ADMIN];
@Controller()
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}
  @Get("articles") async list(@Query() query: ListArticlesDto) { return { success: true, data: await this.articles.list(query) }; }
  @Get("articles/:slug") async detail(@Param("slug") slug: string) { return { success: true, data: await this.articles.findPublic(slug) }; }
  @Get("admin/articles") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...editors) async adminList(@Query() query: ListArticlesDto) { return { success: true, data: await this.articles.list(query, true) }; }
  @Get("admin/articles/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...editors) async adminDetail(@Param("id") id: string) { return { success: true, data: await this.articles.findAdmin(id) }; }
  @Post("admin/articles") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...editors) async create(@Body() input: CreateArticleDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.articles.create(input, user) }; }
  @Patch("admin/articles/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...editors) async update(@Param("id") id: string, @Body() input: UpdateArticleDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.articles.update(id, input, user) }; }
  @Post("admin/articles/:id/submit") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...editors) async submit(@Param("id") id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.articles.submit(id, user) }; }
  @Post("admin/articles/:id/publish") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...publishers) async publish(@Param("id") id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.articles.publish(id, user) }; }
  @Post("admin/articles/:id/offline") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...publishers) async offline(@Param("id") id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.articles.offline(id, user) }; }
}
