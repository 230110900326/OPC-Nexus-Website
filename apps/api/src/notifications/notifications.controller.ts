import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";
@Controller("notifications") @UseGuards(JwtAuthGuard)
export class NotificationsController { constructor(private readonly notifications: NotificationsService) {} @Get() list(@AuthenticatedUser() user: AuthUser, @Query("page") page?: string, @Query("limit") limit?: string) { return this.notifications.list(user.id, Math.max(1, Number(page) || 1), Math.min(100, Math.max(1, Number(limit) || 30))).then((data) => ({ success: true, data })); } @Patch("read") readAll(@AuthenticatedUser() user: AuthUser) { return this.notifications.markRead(user.id).then((data) => ({ success: true, data })); } @Patch(":id/read") read(@AuthenticatedUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) { return this.notifications.markRead(user.id, id).then((data) => ({ success: true, data })); } }
