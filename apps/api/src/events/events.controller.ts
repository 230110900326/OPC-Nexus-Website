import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { CreateEventDto } from "./dto/create-event.dto";
import { ListEventsDto } from "./dto/list-events.dto";
import { RegisterEventDto } from "./dto/register-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { UpdateRegistrationDto } from "./dto/update-registration.dto";
import { EventsService } from "./events.service";

@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}
  @Get() list(@Query() query: ListEventsDto) { return this.events.list(query).then((data) => ({ success: true, data })); }
  @Get("mine/registrations") @UseGuards(JwtAuthGuard) mine(@AuthenticatedUser() user: AuthUser) { return this.events.myRegistrations(user).then((data) => ({ success: true, data })); }
  @Get("manage") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.ADMIN, SystemRole.OPERATOR, SystemRole.EDITOR) manage(@Query() query: ListEventsDto) { return this.events.list(query, true).then((data) => ({ success: true, data })); }
  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.ADMIN, SystemRole.OPERATOR, SystemRole.EDITOR) create(@Body() input: CreateEventDto, @AuthenticatedUser() user: AuthUser) { return this.events.create(input, user).then((data) => ({ success: true, data })); }
  @Get(":id") detail(@Param("id", ParseUUIDPipe) id: string) { return this.events.detail(id).then((data) => ({ success: true, data })); }
  @Patch(":id") @UseGuards(JwtAuthGuard) update(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateEventDto, @AuthenticatedUser() user: AuthUser) { return this.events.update(id, input, user).then((data) => ({ success: true, data })); }
  @Post(":id/registrations") @UseGuards(JwtAuthGuard) register(@Param("id", ParseUUIDPipe) id: string, @Body() input: RegisterEventDto, @AuthenticatedUser() user: AuthUser) { return this.events.register(id, input, user).then((data) => ({ success: true, data })); }
  @Get(":id/registrations") @UseGuards(JwtAuthGuard) registrations(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return this.events.registrationsForEvent(id, user).then((data) => ({ success: true, data })); }
  @Patch(":id/registrations/:registrationId") @UseGuards(JwtAuthGuard) updateRegistration(@Param("id", ParseUUIDPipe) id: string, @Param("registrationId", ParseUUIDPipe) registrationId: string, @Body() input: UpdateRegistrationDto, @AuthenticatedUser() user: AuthUser) { return this.events.updateRegistration(id, registrationId, input, user).then((data) => ({ success: true, data })); }
  @Get(":id/registrations.csv") @UseGuards(JwtAuthGuard) async csv(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser, @Res() response: Response) { const rows = await this.events.exportRows(id, user); const quote = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`; const contents = ["name,email,status,checked_in_at,registered_at,form_data", ...rows.map((row) => [row.name, row.email, row.status, row.checkedInAt, row.registeredAt, row.formData].map(quote).join(","))].join("\n"); response.setHeader("Content-Type", "text/csv; charset=utf-8"); response.setHeader("Content-Disposition", `attachment; filename=event-${id}-registrations.csv`); response.send(`\uFEFF${contents}`); }
}
