import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

export enum AuditAction {
  ADMIN_LOGIN = "admin.login",
  CONTENT_CREATE = "content.create",
  CONTENT_EDIT = "content.edit",
  CONTENT_SUBMIT = "content.submit",
  CONTENT_PUBLISH = "content.publish",
  CONTENT_OFFLINE = "content.offline",
  CONTENT_RESTORE = "content.restore",
  MODERATION_REVIEW = "moderation.review",
  USER_BAN = "user.ban",
  RANKING_WEIGHT_ADJUST = "ranking.weight_adjust",
  HOMEPAGE_CONFIG_CREATE = "homepage.config_create",
  HOMEPAGE_CONFIG_UPDATE = "homepage.config_update",
  HOMEPAGE_CONFIG_DELETE = "homepage.config_delete",
}

@Entity({ name: "audit_logs" })
@Index("IDX_audit_logs_actor_time", ["actor", "createdAt"])
@Index("IDX_audit_logs_action_time", ["action", "createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" }) @JoinColumn({ name: "actor_id" }) actor!: User | null;
  @Column({ name: "actor_name", type: "varchar", length: 80 }) actorName!: string;
  @Column({ name: "actor_email", type: "varchar", length: 254 }) actorEmail!: string;
  @Column({ type: "varchar", length: 60 }) action!: AuditAction;
  @Column({ name: "target_type", type: "varchar", length: 60, nullable: true }) targetType!: string | null;
  @Column({ name: "target_id", type: "varchar", length: 120, nullable: true }) targetId!: string | null;
  @Column({ type: "jsonb", default: () => "'{}'::jsonb" }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
