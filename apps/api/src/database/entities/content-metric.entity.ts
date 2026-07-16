import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum MetricContentType { ARTICLE = "article", POLICY = "policy", VIDEO = "video", POST = "post" }
export enum MetricSource { INTERNAL = "internal", BILIBILI = "bilibili", YOUTUBE = "youtube", DOUYIN = "douyin", IMPORT = "import" }

@Entity({ name: "content_metrics" })
@Index("IDX_content_metrics_history", ["contentType", "contentId", "syncedAt"])
export class ContentMetric {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "content_type", type: "varchar", length: 20 }) contentType!: MetricContentType;
  @Column({ name: "content_id", type: "uuid" }) contentId!: string;
  @Column({ type: "varchar", length: 20, default: MetricSource.INTERNAL }) source!: MetricSource;
  @Column({ name: "read_count", type: "integer", default: 0 }) readCount!: number;
  @Column({ name: "like_count", type: "integer", default: 0 }) likeCount!: number;
  @Column({ name: "comment_count", type: "integer", default: 0 }) commentCount!: number;
  @Column({ name: "favorite_count", type: "integer", default: 0 }) favoriteCount!: number;
  @Column({ name: "share_count", type: "integer", default: 0 }) shareCount!: number;
  @Column({ name: "external_view_count", type: "integer", default: 0 }) externalViewCount!: number;
  @Column({ name: "external_like_count", type: "integer", default: 0 }) externalLikeCount!: number;
  @Column({ name: "editor_score", type: "numeric", default: 0 }) editorScore!: number;
  @Column({ name: "source_trust", type: "numeric", default: 0.5 }) sourceTrust!: number;
  @Column({ name: "synced_at", type: "timestamptz" }) syncedAt!: Date;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
