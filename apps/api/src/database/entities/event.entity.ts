import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { EventRegistration } from "./event-registration.entity";

export enum EventStatus { DRAFT = "draft", PUBLISHED = "published", CANCELLED = "cancelled", COMPLETED = "completed" }

@Entity({ name: "events" })
export class Event {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ length: 160 }) title!: string;
  @Column({ type: "text" }) description!: string;
  @Column({ name: "cover_url", type: "varchar", length: 500, nullable: true }) coverUrl!: string | null;
  @Column({ name: "location_name", length: 160 }) locationName!: string;
  @Column({ name: "location_address", type: "varchar", length: 280, nullable: true }) locationAddress!: string | null;
  @Column({ name: "starts_at", type: "timestamptz" }) startsAt!: Date;
  @Column({ name: "ends_at", type: "timestamptz" }) endsAt!: Date;
  @Column({ name: "registration_deadline", type: "timestamptz", nullable: true }) registrationDeadline!: Date | null;
  @Column({ name: "capacity", type: "integer", nullable: true }) capacity!: number | null;
  @Column({ name: "registration_fields", type: "jsonb", default: () => "'[]'::jsonb" }) registrationFields!: EventRegistrationField[];
  @Column({ type: "varchar", length: 20, default: EventStatus.DRAFT }) status!: EventStatus;
  @ManyToOne(() => User, { nullable: false }) @JoinColumn({ name: "organizer_id" }) organizer!: User;
  @OneToMany(() => EventRegistration, (registration) => registration.event) registrations!: EventRegistration[];
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}

export type EventRegistrationField = { key: string; label: string; required?: boolean; type?: "text" | "textarea" | "select"; options?: string[] };
