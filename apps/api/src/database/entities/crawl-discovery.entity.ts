import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { CrawlSource } from "./crawl-source.entity";
@Entity({ name: "crawl_discoveries" }) @Unique("UQ_crawl_discoveries_source_url", ["source", "url"])
export class CrawlDiscovery { @PrimaryGeneratedColumn("uuid") id!: string; @ManyToOne(() => CrawlSource, { nullable: false, onDelete: "CASCADE" }) @JoinColumn({ name: "source_id" }) source!: CrawlSource; @Column({ length: 1000 }) url!: string; @CreateDateColumn({ name: "discovered_at", type: "timestamptz" }) discoveredAt!: Date; @Column({ name: "queued_at", type: "timestamptz", nullable: true }) queuedAt!: Date | null; }
