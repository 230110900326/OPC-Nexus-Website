import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";

export enum HomepageConfigKind {
  BANNER = "banner",
  MODULE = "module",
  RECOMMENDATION = "recommendation",
}

export enum HomepageModuleKey {
  FOCUS = "focus",
  RECOMMENDATIONS = "recommendations",
  POLICIES = "policies",
  VIDEOS = "videos",
  DISCUSSIONS = "discussions",
  EVENTS = "events",
  CREATORS = "creators",
}

export enum HomepageContentType {
  ARTICLE = "article",
  POLICY = "policy",
  VIDEO = "video",
  POST = "post",
  EVENT = "event",
  CREATOR = "creator",
}

@Entity({ name: "homepage_configs" })
export class HomepageConfig {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 24 }) kind!: HomepageConfigKind;
  @Column({ name: "module_key", type: "varchar", length: 40 }) moduleKey!: HomepageModuleKey;
  @Column({ type: "varchar", length: 180 }) title!: string;
  @Column({ type: "varchar", length: 600, nullable: true }) subtitle!: string | null;
  @Column({ name: "target_url", type: "varchar", length: 1000, nullable: true }) targetUrl!: string | null;
  @Column({ name: "image_url", type: "varchar", length: 1000, nullable: true }) imageUrl!: string | null;
  @Column({ name: "display_position", type: "varchar", length: 60, default: "main" }) displayPosition!: string;
  @Column({ name: "sort_order", type: "integer", default: 0 }) sortOrder!: number;
  @Column({ name: "content_type", type: "varchar", length: 24, nullable: true }) contentType!: HomepageContentType | null;
  @Column({ name: "content_id", type: "uuid", nullable: true }) contentId!: string | null;
  @Column({ name: "effective_from", type: "timestamptz", nullable: true }) effectiveFrom!: Date | null;
  @Column({ name: "effective_to", type: "timestamptz", nullable: true }) effectiveTo!: Date | null;
  @Column({ name: "is_online", type: "boolean", default: false }) isOnline!: boolean;
  @Column({ type: "jsonb", default: () => "'{}'::jsonb" }) config!: Record<string, unknown>;
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" }) @JoinColumn({ name: "created_by_id" }) createdBy!: User | null;
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" }) @JoinColumn({ name: "updated_by_id" }) updatedBy!: User | null;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}
