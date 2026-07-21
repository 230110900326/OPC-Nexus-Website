import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum CrawlSourceType { NEWS = "news", POLICY = "policy", VIDEO = "video", RSS = "rss", SITEMAP = "sitemap" }
export enum CrawlFetchMethod { HTML = "html", RSS = "rss", SITEMAP = "sitemap", ADAPTER = "adapter" }
export enum CrawlAuthorizationStatus { PENDING = "pending", AUTHORIZED = "authorized", RESTRICTED = "restricted", REJECTED = "rejected" }

@Entity({ name: "crawl_sources" })
export class CrawlSource {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ length: 160 }) name!: string;
  @Column({ length: 255, unique: true }) domain!: string;
  @Column({ type: "varchar", length: 20 }) type!: CrawlSourceType;
  @Column({ name: "fetch_method", type: "varchar", length: 20 }) fetchMethod!: CrawlFetchMethod;
  @Column({ name: "schedule_minutes", type: "integer", default: 360 }) scheduleMinutes!: number;
  @Column({ name: "trust_level", type: "smallint", default: 3 }) trustLevel!: number;
  @Column({ name: "authorization_status", type: "varchar", length: 20, default: CrawlAuthorizationStatus.PENDING }) authorizationStatus!: CrawlAuthorizationStatus;
  @Column({ name: "is_enabled", default: false }) isEnabled!: boolean;
  @Column({ name: "auto_publish", default: false }) autoPublish!: boolean;
  @Column({ name: "keywords", type: "jsonb", default: () => "'[]'::jsonb" }) keywords!: string[];
  @Column({ name: "entry_url", type: "varchar", length: 1000, nullable: true }) entryUrl!: string | null;
  @Column({ name: "last_crawled_at", type: "timestamptz", nullable: true }) lastCrawledAt!: Date | null;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}
