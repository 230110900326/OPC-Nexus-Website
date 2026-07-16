import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "demand_board_configs" })
export class DemandBoardConfig {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "banner_title", type: "varchar", length: 180 }) bannerTitle!: string;
  @Column({ name: "banner_subtitle", type: "varchar", length: 600 }) bannerSubtitle!: string;
  @Column({ name: "rules_text", type: "text" }) rulesText!: string;
  @Column({ type: "text" }) disclaimer!: string;
  @Column({ name: "prohibited_keywords", type: "jsonb", default: () => "'[]'::jsonb" }) prohibitedKeywords!: string[];
  @Column({ name: "normal_daily_limit", type: "integer", default: 3 }) normalDailyLimit!: number;
  @Column({ name: "verified_daily_limit", type: "integer", default: 10 }) verifiedDailyLimit!: number;
  @Column({ name: "connect_daily_limit", type: "integer", default: 20 }) connectDailyLimit!: number;
  @Column({ name: "max_pinned", type: "integer", default: 10 }) maxPinned!: number;
  @Column({ name: "allow_phone", type: "boolean", default: true }) allowPhone!: boolean;
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" }) @JoinColumn({ name: "updated_by_id" }) updatedBy!: User | null;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}
