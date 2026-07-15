import { Controller, Delete, Get, Param, ParseEnumPipe, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FavoriteTargetType } from "../database/entities/favorite.entity";
import { FollowTargetType } from "../database/entities/follow.entity";
import { LikeTargetType } from "../database/entities/like.entity";
import { InteractionsService } from "./interactions.service";

@Controller("interactions")
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}
  @Get("me") @UseGuards(JwtAuthGuard) async mine(@AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.interactions.mine(user.id) }; }
  @Get(":targetType/:targetId") async summary(@Param("targetType") targetType: string, @Param("targetId", ParseUUIDPipe) targetId: string) { return { success: true, data: await this.interactions.summary(targetType, targetId) }; }
  @Post("likes/:targetType/:targetId") @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 30, ttl: 60000 } }) async like(@AuthenticatedUser() user: AuthUser, @Param("targetType", new ParseEnumPipe(LikeTargetType)) targetType: LikeTargetType, @Param("targetId", ParseUUIDPipe) targetId: string) { return { success: true, data: await this.interactions.addLike(user.id, targetType, targetId) }; }
  @Delete("likes/:targetType/:targetId") @UseGuards(JwtAuthGuard) async unlike(@AuthenticatedUser() user: AuthUser, @Param("targetType", new ParseEnumPipe(LikeTargetType)) targetType: LikeTargetType, @Param("targetId", ParseUUIDPipe) targetId: string) { return { success: true, data: await this.interactions.removeLike(user.id, targetType, targetId) }; }
  @Post("favorites/:targetType/:targetId") @UseGuards(JwtAuthGuard) async favorite(@AuthenticatedUser() user: AuthUser, @Param("targetType", new ParseEnumPipe(FavoriteTargetType)) targetType: FavoriteTargetType, @Param("targetId", ParseUUIDPipe) targetId: string) { return { success: true, data: await this.interactions.addFavorite(user.id, targetType, targetId) }; }
  @Delete("favorites/:targetType/:targetId") @UseGuards(JwtAuthGuard) async unfavorite(@AuthenticatedUser() user: AuthUser, @Param("targetType", new ParseEnumPipe(FavoriteTargetType)) targetType: FavoriteTargetType, @Param("targetId", ParseUUIDPipe) targetId: string) { return { success: true, data: await this.interactions.removeFavorite(user.id, targetType, targetId) }; }
  @Post("follows/:targetType/:targetId") @UseGuards(JwtAuthGuard) async follow(@AuthenticatedUser() user: AuthUser, @Param("targetType", new ParseEnumPipe(FollowTargetType)) targetType: FollowTargetType, @Param("targetId", ParseUUIDPipe) targetId: string) { return { success: true, data: await this.interactions.addFollow(user.id, targetType, targetId) }; }
  @Delete("follows/:targetType/:targetId") @UseGuards(JwtAuthGuard) async unfollow(@AuthenticatedUser() user: AuthUser, @Param("targetType", new ParseEnumPipe(FollowTargetType)) targetType: FollowTargetType, @Param("targetId", ParseUUIDPipe) targetId: string) { return { success: true, data: await this.interactions.removeFollow(user.id, targetType, targetId) }; }
}
