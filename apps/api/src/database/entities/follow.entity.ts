import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "./user.entity";
export enum FollowTargetType { USER = "user", CREATOR = "creator" }
@Entity({ name: "follows" }) @Unique("UQ_follows_follower_target", ["follower", "targetType", "targetId"])
export class Follow {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { onDelete: "CASCADE" }) @JoinColumn({ name: "follower_id" }) follower!: User;
  @Column({ name: "target_type", type: "varchar", length: 20 }) targetType!: FollowTargetType;
  @Index() @Column({ name: "target_id", type: "uuid" }) targetId!: string;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
