import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CrawlSource } from "./crawl-source.entity";
export enum CrawlJobStatus { QUEUED = "queued", RUNNING = "running", SUCCEEDED = "succeeded", FAILED = "failed" }
@Entity({ name: "crawl_jobs" })
export class CrawlJob {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => CrawlSource, { nullable: false, onDelete: "CASCADE" }) @JoinColumn({ name: "source_id" }) source!: CrawlSource;
  @Column({ type: "varchar", length: 20, default: CrawlJobStatus.QUEUED }) status!: CrawlJobStatus;
  @Column({ name: "queue_key", length: 100 }) queueKey!: string;
  @Column({ name: "started_at", type: "timestamptz", nullable: true }) startedAt!: Date | null;
  @Column({ name: "finished_at", type: "timestamptz", nullable: true }) finishedAt!: Date | null;
  @Column({ name: "duration_ms", type: "integer", nullable: true }) durationMs!: number | null;
  @Column({ name: "discovered_count", type: "integer", default: 0 }) discoveredCount!: number;
  @Column({ name: "error_message", type: "text", nullable: true }) errorMessage!: string | null;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}
