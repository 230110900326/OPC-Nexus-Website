import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "./user.entity";
export enum LikeTargetType { ARTICLE = "article", VIDEO = "video", POST = "post", COMMENT = "comment" }
@Entity({ name: "likes" }) @Unique("UQ_likes_user_target", ["user", "targetType", "targetId"])
export class Like {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { onDelete: "CASCADE" }) @JoinColumn({ name: "user_id" }) user!: User;
  @Column({ name: "target_type", type: "varchar", length: 20 }) targetType!: LikeTargetType;
  @Index() @Column({ name: "target_id", type: "uuid" }) targetId!: string;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
