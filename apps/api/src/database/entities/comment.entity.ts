import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Post } from "./post.entity";
import { User } from "./user.entity";
export enum CommentStatus { REVIEW = "review", PUBLISHED = "published", HIDDEN = "hidden", DELETED = "deleted" }
@Entity({ name: "comments" })
export class Comment {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "text" }) body!: string;
  @Column({ type: "varchar", length: 20, default: CommentStatus.PUBLISHED }) status!: CommentStatus;
  @ManyToOne(() => Post, (post) => post.comments, { nullable: true, onDelete: "CASCADE" }) @JoinColumn({ name: "post_id" }) post!: Post;
  @Column({ type: "varchar", length: 20, nullable: true, name: "target_type" }) targetType!: string | null;
  @Column({ type: "uuid", nullable: true, name: "target_id" }) targetId!: string | null;
  @ManyToOne(() => User, { nullable: false }) @JoinColumn({ name: "author_id" }) author!: User;
  @ManyToOne(() => Comment, (comment) => comment.children, { nullable: true, onDelete: "CASCADE" }) @JoinColumn({ name: "parent_id" }) parent!: Comment | null;
  @OneToMany(() => Comment, (comment) => comment.parent) children!: Comment[];
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}
