import { Column, CreateDateColumn, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, JoinColumn, JoinTable, UpdateDateColumn } from "typeorm";
import { Category } from "./category.entity";
import { Tag } from "./tag.entity";
import { User } from "./user.entity";
import { ArticleSource } from "./article-source.entity";
export enum ArticleType { NEWS = "news", POLICY = "policy", INSIGHT = "insight" }
export enum ArticleStatus { DRAFT = "draft", REVIEW = "review", PUBLISHED = "published", OFFLINE = "offline" }
@Entity({ name: "articles" })
export class Article {
  @PrimaryGeneratedColumn("uuid") id!: string; @Column({ unique: true, length: 180 }) slug!: string; @Column({ type: "varchar", length: 240 }) title!: string;
  @Column({ type: "varchar", length: 800 }) summary!: string; @Column({ name: "cover_image_url", type: "varchar", nullable: true, length: 500 }) coverImageUrl!: string | null;
  @Column({ type: "varchar", length: 20 }) type!: ArticleType; @Column({ type: "varchar", length: 20, default: ArticleStatus.DRAFT }) status!: ArticleStatus;
  @Column({ name: "original_url", length: 1000 }) originalUrl!: string; @Column({ name: "published_at", type: "timestamptz", nullable: true }) publishedAt!: Date | null;
  @Column({ name: "heat_score", type: "numeric", default: 0 }) heatScore!: number; @Column({ name: "policy_issuer", type: "varchar", nullable: true, length: 160 }) policyIssuer!: string | null;
  @Column({ name: "policy_number", type: "varchar", nullable: true, length: 100 }) policyNumber!: string | null; @Column({ name: "effective_date", type: "date", nullable: true }) effectiveDate!: string | null;
  @Column({ name: "applicable_region", type: "varchar", nullable: true, length: 100 }) applicableRegion!: string | null; @Column({ name: "policy_status", type: "varchar", nullable: true, length: 40 }) policyStatus!: string | null;
  @Column({ name: "policy_highlights", type: "text", nullable: true }) policyHighlights!: string | null; @Column({ name: "impact_industries", type: "text", nullable: true }) impactIndustries!: string | null;
  @ManyToOne(() => Category, { nullable: true }) @JoinColumn({ name: "category_id" }) category!: Category | null; @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: "operator_id" }) operator!: User | null;
  @ManyToMany(() => Tag) @JoinTable({ name: "content_tags", joinColumn: { name: "article_id", referencedColumnName: "id" }, inverseJoinColumn: { name: "tag_id", referencedColumnName: "id" } }) tags!: Tag[];
  @OneToMany(() => ArticleSource, (source) => source.article, { cascade: true }) sources!: ArticleSource[];
  @Column({ name: "search_document", type: "tsvector", select: false, insert: false, update: false }) searchDocument!: string;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}
