import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "../database/entities/notification.entity";
import { User } from "../database/entities/user.entity";

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private readonly notifications: Repository<Notification>) {}
  async create(userId: string, type: NotificationType, title: string, body: string, targetType?: string, targetId?: string) { if (!userId) return; await this.notifications.save(this.notifications.create({ user: { id: userId } as User, type, title, body, targetType: targetType ?? null, targetId: targetId ?? null })); }
  async list(userId: string, page = 1, limit = 30) { const [items, total] = await this.notifications.findAndCount({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, skip: (page - 1) * limit, take: limit }); return { items, unreadCount: await this.notifications.count({ where: { user: { id: userId }, isRead: false } }), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }; }
  async markRead(userId: string, id?: string) { const criteria = id ? { id, user: { id: userId } } : { user: { id: userId }, isRead: false }; await this.notifications.update(criteria, { isRead: true }); return { id: id ?? null }; }
}
