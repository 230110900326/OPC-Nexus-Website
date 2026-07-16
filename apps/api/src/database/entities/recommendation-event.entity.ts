import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { HomepageConfig } from "./homepage-config.entity";

export enum RecommendationEventType {
  IMPRESSION = "impression",
  CLICK = "click",
}

@Entity({ name: "recommendation_events" })
@Index("IDX_recommendation_events_config_time", ["homepageConfig", "createdAt"])
export class RecommendationEvent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => HomepageConfig, { nullable: true, onDelete: "SET NULL" }) @JoinColumn({ name: "homepage_config_id" }) homepageConfig!: HomepageConfig | null;
  @Column({ name: "event_type", type: "varchar", length: 20 }) eventType!: RecommendationEventType;
  @Column({ name: "session_hash", type: "varchar", length: 64, nullable: true }) sessionHash!: string | null;
  @Column({ name: "page_path", type: "varchar", length: 240, default: "/" }) pagePath!: string;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
}
