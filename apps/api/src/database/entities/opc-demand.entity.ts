import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ForumSection } from "./forum-section.entity";
import { OpcDemandConnect } from "./opc-demand-connect.entity";
import { User } from "./user.entity";

export enum DemandType {
  RESEARCH_COLLECTION = "research_collection",
  REPORT_WRITING = "report_writing",
  FIELD_VISIT = "field_visit",
  DATA_ORGANIZATION = "data_organization",
  POLICY_ANALYSIS = "policy_analysis",
  PROJECT_CONSULTING = "project_consulting",
  OTHER = "other",
}

export enum DemandBudgetRange {
  VOLUNTEER = "volunteer",
  UNDER_500 = "under_500",
  FROM_500_TO_2000 = "500_2000",
  FROM_2000_TO_10000 = "2000_10000",
  OVER_10000 = "over_10000",
}

export enum DemandStatus {
  DRAFT = "draft",
  PENDING_REVIEW = "pending_review",
  PUBLISHED = "published",
  COMPLETED = "completed",
  OFFLINE = "offline",
  BLOCKED = "blocked",
}

export enum DemandContactType {
  QQ = "qq",
  WECHAT = "wechat",
  PHONE = "phone",
  ENTERPRISE_WECHAT = "enterprise_wechat",
}

export type DemandContactMethod = { type: DemandContactType; value: string };

@Entity({ name: "opc_demands" })
@Index("IDX_opc_demands_author_status", ["author", "status", "createdAt"])
@Index("IDX_opc_demands_contact_time", ["contactHash", "createdAt"])
export class OpcDemand {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" }) @JoinColumn({ name: "user_id" }) author!: User;
  @Column({ type: "varchar", length: 60 }) title!: string;
  @Column({ type: "text" }) content!: string;
  @Column({ name: "image_urls", type: "jsonb", default: () => "'[]'::jsonb" }) imageUrls!: string[];
  @Column({ name: "contact_info", type: "jsonb", default: () => "'[]'::jsonb" }) contactInfo!: DemandContactMethod[];
  @ManyToMany(() => ForumSection)
  @JoinTable({ name: "opc_demand_industries", joinColumn: { name: "demand_id", referencedColumnName: "id" }, inverseJoinColumn: { name: "section_id", referencedColumnName: "id" } })
  industries!: ForumSection[];
  @Column({ name: "demand_type", type: "varchar", length: 40 }) demandType!: DemandType;
  @Column({ name: "budget_range", type: "varchar", length: 30 }) budgetRange!: DemandBudgetRange;
  @Column({ type: "timestamptz", nullable: true }) deadline!: Date | null;
  @Column({ type: "varchar", length: 30, default: DemandStatus.DRAFT }) status!: DemandStatus;
  @Column({ name: "top_weight", type: "integer", default: 0 }) topWeight!: number;
  @Column({ name: "view_count", type: "integer", default: 0 }) viewCount!: number;
  @Column({ name: "connect_count", type: "integer", default: 0 }) connectCount!: number;
  @Column({ name: "heat_score", type: "numeric", default: 0 }) heatScore!: number;
  @Column({ name: "risk_flags", type: "jsonb", default: () => "'[]'::jsonb" }) riskFlags!: string[];
  @Column({ name: "contact_hash", type: "varchar", length: 64 }) contactHash!: string;
  @Column({ name: "review_reason", type: "varchar", length: 1000, nullable: true }) reviewReason!: string | null;
  @Column({ name: "rules_accepted_at", type: "timestamptz", nullable: true }) rulesAcceptedAt!: Date | null;
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" }) @JoinColumn({ name: "reviewed_by_id" }) reviewedBy!: User | null;
  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true }) reviewedAt!: Date | null;
  @Column({ name: "deadline_reminder_sent_at", type: "timestamptz", nullable: true }) deadlineReminderSentAt!: Date | null;
  @OneToMany(() => OpcDemandConnect, (connect) => connect.demand) connections!: OpcDemandConnect[];
  @Column({ name: "search_document", type: "tsvector", select: false, insert: false, update: false }) searchDocument!: string;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true }) deletedAt!: Date | null;
}
