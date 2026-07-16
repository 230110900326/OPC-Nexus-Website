import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
@Entity({ name: "content_keywords" })
export class ContentKeyword {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ length: 80 }) industry!: string;
  @Column({ length: 80, unique: true }) keyword!: string;
  @Column({ type: "numeric", default: 1 }) weight!: number;
  @Column({ name: "is_active", default: true }) isActive!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date;
}
