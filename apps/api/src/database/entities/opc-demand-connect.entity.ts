import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { OpcDemand } from "./opc-demand.entity";
import { User } from "./user.entity";

export enum DemandConnectStatus {
  PENDING_VIEW = "pending_view",
  VIEWED = "viewed",
  COMMUNICATED = "communicated",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity({ name: "opc_demand_connect" })
@Unique("UQ_opc_demand_connect_demand_user", ["demand", "applyUser"])
@Index("IDX_opc_demand_connect_user_time", ["applyUser", "createdAt"])
export class OpcDemandConnect {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => OpcDemand, (demand) => demand.connections, { nullable: false, onDelete: "CASCADE" }) @JoinColumn({ name: "demand_id" }) demand!: OpcDemand;
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" }) @JoinColumn({ name: "apply_user_id" }) applyUser!: User;
  @Column({ name: "apply_msg", type: "varchar", length: 1000 }) applyMsg!: string;
  @Column({ name: "contact_status", type: "varchar", length: 30, default: DemandConnectStatus.PENDING_VIEW }) status!: DemandConnectStatus;
  @Column({ name: "is_anomalous", type: "boolean", default: false }) isAnomalous!: boolean;
  @Column({ name: "risk_reason", type: "varchar", length: 240, nullable: true }) riskReason!: string | null;
  @Column({ name: "counts_toward_heat", type: "boolean", default: true }) countsTowardHeat!: boolean;
  @Column({ name: "viewed_at", type: "timestamptz", nullable: true }) viewedAt!: Date | null;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}
