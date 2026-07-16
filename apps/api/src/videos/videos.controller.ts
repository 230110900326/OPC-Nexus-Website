import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { CreateCreatorAccountDto } from "./dto/create-creator-account.dto";
import { CreateCreatorDto } from "./dto/create-creator.dto";
import { ListVideosDto } from "./dto/list-videos.dto";
import { UpdateSubtitleDto } from "./dto/update-subtitle.dto";
import { VideosService } from "./videos.service";
const operators = [SystemRole.ADMIN, SystemRole.OPERATOR, SystemRole.EDITOR];
@Controller()
export class VideosController { constructor(private readonly videos: VideosService) {} @Get("videos") list(@Query() query: ListVideosDto) { return this.videos.list(query).then((data) => ({ success: true, data })); } @Get("admin/creators") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators) creators() { return this.videos.listCreators().then((data) => ({ success: true, data })); } @Post("admin/creators") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators) createCreator(@Body() input: CreateCreatorDto) { return this.videos.createCreator(input).then((data) => ({ success: true, data })); } @Post("admin/creator-accounts") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators) createAccount(@Body() input: CreateCreatorAccountDto) { return this.videos.createAccount(input).then((data) => ({ success: true, data })); } @Post("admin/creator-accounts/:id/sync-local") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators) sync(@Param("id", ParseUUIDPipe) id: string) { return this.videos.syncLocal(id).then((data) => ({ success: true, data })); } @Post("admin/videos/:id/subtitle") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators) subtitle(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateSubtitleDto) { return this.videos.updateSubtitle(id, input).then((data) => ({ success: true, data })); } }
