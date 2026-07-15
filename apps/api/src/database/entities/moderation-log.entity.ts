import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
@Entity({ name: "moderation_logs" })
export class ModerationLog {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { nullable: false }) @JoinColumn({ name: "operator_id" }) operator!: User;
  @Column({ name: "target_type", type: "varchar", length: 20 }) targetType!: string;
  @Index() @Column({ name: "target_id", type: "uuid" }) targetId!: string;
  @Column({ length: 40 }) action!: string;
  @Column({ length: 500 }) reason!: string;
  @Column({ type: "jsonb", default: () => "'{}'::jsonb" }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
