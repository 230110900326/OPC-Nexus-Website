import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Role } from "./role.entity";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, type: "varchar", length: 254 })
  email!: string;

  @Column({ name: "password_hash", type: "varchar", length: 255, select: false })
  passwordHash!: string;

  @Column({ name: "display_name", type: "varchar", length: 60 })
  displayName!: string;

  @Column({ name: "avatar_url", type: "varchar", length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: "varchar", length: 280, nullable: true })
  bio!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  industry!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  company!: string | null;

  @Column({ name: "job_title", type: "varchar", length: 80, nullable: true })
  jobTitle!: string | null;

  @Column({ name: "refresh_token_hash", type: "varchar", length: 255, nullable: true, select: false })
  refreshTokenHash!: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "ban_reason", type: "varchar", length: 500, nullable: true })
  banReason!: string | null;

  @Column({ name: "banned_at", type: "timestamptz", nullable: true })
  bannedAt!: Date | null;

  @ManyToMany(() => Role)
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles!: Role[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
