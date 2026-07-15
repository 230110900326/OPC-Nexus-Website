import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ForumSection } from "./forum-section.entity";
import { User } from "./user.entity";
import { Comment } from "./comment.entity";
export enum PostStatus { DRAFT = "draft", PUBLISHED = "published", HIDDEN = "hidden" }
@Entity({ name: "posts" })
export class Post {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ length: 180 }) title!: string;
  @Column({ type: "text" }) body!: string;
  @Column({ type: "varchar", length: 20, default: PostStatus.PUBLISHED }) status!: PostStatus;
  @Column({ name: "is_locked", default: false }) isLocked!: boolean;
  @Column({ name: "is_pinned", default: false }) isPinned!: boolean;
  @Column({ name: "is_featured", default: false }) isFeatured!: boolean;
  @Column({ name: "view_count", default: 0 }) viewCount!: number;
  @Column({ name: "comment_count", default: 0 }) commentCount!: number;
  @Column({ name: "heat_score", type: "numeric", default: 0 }) heatScore!: number;
  @ManyToOne(() => ForumSection, (section) => section.posts, { nullable: false }) @JoinColumn({ name: "section_id" }) section!: ForumSection;
  @ManyToOne(() => User, { nullable: false }) @JoinColumn({ name: "author_id" }) author!: User;
  @OneToMany(() => Comment, (comment) => comment.post) comments!: Comment[];
  @Column({ name: "search_document", type: "tsvector", select: false, insert: false, update: false }) searchDocument!: string;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true }) deletedAt!: Date | null;
}
