import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CrawlJob } from "./crawl-job.entity";
@Entity({ name: "crawl_logs" })
export class CrawlLog {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => CrawlJob, { nullable: false, onDelete: "CASCADE" }) @JoinColumn({ name: "job_id" }) job!: CrawlJob;
  @Column({ type: "varchar", length: 10 }) level!: "info" | "warning" | "error";
  @Column({ type: "text" }) message!: string;
  @Column({ name: "metadata", type: "jsonb", default: () => "'{}'::jsonb" }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
