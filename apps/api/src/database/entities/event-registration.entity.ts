import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from "typeorm";
import { Event } from "./event.entity";
import { User } from "./user.entity";

export enum EventRegistrationStatus { PENDING = "pending", CONFIRMED = "confirmed", CANCELLED = "cancelled" }

@Entity({ name: "event_registrations" })
@Unique("UQ_event_registrations_event_user", ["event", "user"])
export class EventRegistration {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Event, (event) => event.registrations, { nullable: false, onDelete: "CASCADE" }) @JoinColumn({ name: "event_id" }) event!: Event;
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" }) @JoinColumn({ name: "user_id" }) user!: User;
  @Column({ type: "varchar", length: 20, default: EventRegistrationStatus.PENDING }) status!: EventRegistrationStatus;
  @Column({ name: "form_data", type: "jsonb", default: () => "'{}'::jsonb" }) formData!: Record<string, string>;
  @Column({ name: "checked_in_at", type: "timestamptz", nullable: true }) checkedInAt!: Date | null;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}
