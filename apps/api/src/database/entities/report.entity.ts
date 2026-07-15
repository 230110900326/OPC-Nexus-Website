import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
export enum ReportTargetType { POST = "post", COMMENT = "comment", ARTICLE = "article", USER = "user" }
export enum ReportStatus { PENDING = "pending", RESOLVED = "resolved", REJECTED = "rejected" }
@Entity({ name: "reports" })
export class Report {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { nullable: false }) @JoinColumn({ name: "reporter_id" }) reporter!: User;
  @Column({ name: "target_type", type: "varchar", length: 20 }) targetType!: ReportTargetType;
  @Index() @Column({ name: "target_id", type: "uuid" }) targetId!: string;
  @Column({ length: 80 }) reason!: string;
  @Column({ type: "varchar", length: 1000, nullable: true }) details!: string | null;
  @Column({ type: "varchar", length: 20, default: ReportStatus.PENDING }) status!: ReportStatus;
  @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: "handled_by_id" }) handledBy!: User | null;
  @Column({ type: "varchar", length: 1000, nullable: true }) resolution!: string | null;
  @Column({ name: "handled_at", type: "timestamptz", nullable: true }) handledAt!: Date | null;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
