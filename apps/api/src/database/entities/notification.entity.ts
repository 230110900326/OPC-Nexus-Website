import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

export enum NotificationType { COMMENT_REPLY = "comment_reply", CONTENT_MODERATED = "content_moderated", FOLLOWED_AUTHOR_UPDATE = "followed_author_update", EVENT_STATUS_CHANGED = "event_status_changed", DEMAND_REVIEW_RESULT = "demand_review_result", DEMAND_CONNECT_RECEIVED = "demand_connect_received", DEMAND_CONNECT_VIEWED = "demand_connect_viewed", DEMAND_DEADLINE_REMINDER = "demand_deadline_reminder", DEMAND_MODERATED = "demand_moderated" }

@Entity({ name: "notifications" })
export class Notification {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" }) @JoinColumn({ name: "user_id" }) user!: User;
  @Column({ type: "varchar", length: 40 }) type!: NotificationType;
  @Column({ length: 160 }) title!: string;
  @Column({ type: "text" }) body!: string;
  @Column({ name: "target_type", type: "varchar", length: 40, nullable: true }) targetType!: string | null;
  @Column({ name: "target_id", type: "uuid", nullable: true }) targetId!: string | null;
  @Column({ name: "is_read", default: false }) isRead!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
