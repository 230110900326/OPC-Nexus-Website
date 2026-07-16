import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "interaction_audits" })
@Index("IDX_interaction_audits_user_time", ["user", "createdAt"])
export class InteractionAudit {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" }) @JoinColumn({ name: "user_id" }) user!: User | null;
  @Column({ name: "target_type", type: "varchar", length: 20 }) targetType!: string;
  @Column({ name: "target_id", type: "uuid" }) targetId!: string;
  @Column({ type: "varchar", length: 30 }) action!: string;
  @Column({ name: "ip_hash", type: "varchar", length: 64, nullable: true }) ipHash!: string | null;
  @Column({ name: "device_hash", type: "varchar", length: 64, nullable: true }) deviceHash!: string | null;
  @Column({ name: "is_anomalous", default: false }) isAnomalous!: boolean;
  @Column({ name: "anomaly_reason", type: "varchar", length: 160, nullable: true }) anomalyReason!: string | null;
  @Column({ name: "counts_toward_metrics", default: true }) countsTowardMetrics!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
