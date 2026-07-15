import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { CatalogService } from "./catalog.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateTagDto } from "./dto/create-tag.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdateTagDto } from "./dto/update-tag.dto";

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get("categories") async categories() { return { success: true, data: await this.catalog.listCategories() }; }
  @Get("tags") async tags() { return { success: true, data: await this.catalog.listTags() }; }

  @Get("admin/categories") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.EDITOR, SystemRole.OPERATOR, SystemRole.ADMIN) async adminCategories() { return { success: true, data: await this.catalog.listCategories(false) }; }
  @Post("admin/categories") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.EDITOR, SystemRole.OPERATOR, SystemRole.ADMIN) async createCategory(@Body() input: CreateCategoryDto) { return { success: true, data: await this.catalog.createCategory(input) }; }
  @Patch("admin/categories/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.EDITOR, SystemRole.OPERATOR, SystemRole.ADMIN) async updateCategory(@Param("id") id: string, @Body() input: UpdateCategoryDto) { return { success: true, data: await this.catalog.updateCategory(id, input) }; }
  @Delete("admin/categories/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.OPERATOR, SystemRole.ADMIN) async deleteCategory(@Param("id") id: string) { return { success: true, data: await this.catalog.deleteCategory(id) }; }
  @Get("admin/tags") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.EDITOR, SystemRole.OPERATOR, SystemRole.ADMIN) async adminTags() { return { success: true, data: await this.catalog.listTags() }; }
  @Post("admin/tags") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.EDITOR, SystemRole.OPERATOR, SystemRole.ADMIN) async createTag(@Body() input: CreateTagDto) { return { success: true, data: await this.catalog.createTag(input) }; }
  @Patch("admin/tags/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.EDITOR, SystemRole.OPERATOR, SystemRole.ADMIN) async updateTag(@Param("id") id: string, @Body() input: UpdateTagDto) { return { success: true, data: await this.catalog.updateTag(id, input) }; }
  @Delete("admin/tags/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.OPERATOR, SystemRole.ADMIN) async deleteTag(@Param("id") id: string) { return { success: true, data: await this.catalog.deleteTag(id) }; }
}
