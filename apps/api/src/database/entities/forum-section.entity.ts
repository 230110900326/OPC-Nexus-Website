import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Post } from "./post.entity";
@Entity({ name: "forum_sections" })
export class ForumSection {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ unique: true, length: 80 }) slug!: string;
  @Column({ length: 80 }) name!: string;
  @Column({ length: 280 }) description!: string;
  @Column({ name: "sort_order", default: 0 }) sortOrder!: number;
  @Column({ name: "is_active", default: true }) isActive!: boolean;
  @OneToMany(() => Post, (post) => post.section) posts!: Post[];
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}
