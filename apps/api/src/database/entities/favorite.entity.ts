import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "./user.entity";
export enum FavoriteTargetType { ARTICLE = "article", VIDEO = "video", POST = "post", DEMAND = "demand" }
@Entity({ name: "favorites" }) @Unique("UQ_favorites_user_target", ["user", "targetType", "targetId"])
export class Favorite {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { onDelete: "CASCADE" }) @JoinColumn({ name: "user_id" }) user!: User;
  @Column({ name: "target_type", type: "varchar", length: 20 }) targetType!: FavoriteTargetType;
  @Index() @Column({ name: "target_id", type: "uuid" }) targetId!: string;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
