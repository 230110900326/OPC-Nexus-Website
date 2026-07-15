import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { EventRegistration } from "../database/entities/event-registration.entity";
import { Event } from "../database/entities/event.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
@Module({ imports: [AuthModule, NotificationsModule, TypeOrmModule.forFeature([Event, EventRegistration])], controllers: [EventsController], providers: [EventsService] }) export class EventsModule {}
