import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "categories" })
export class Category {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ unique: true, length: 80 }) slug!: string;
  @Column({ length: 80 }) name!: string;
  @Column({ name: "sort_order", default: 0 }) sortOrder!: number;
  @Column({ name: "is_active", default: true }) isActive!: boolean;
  @ManyToOne(() => Category, (category) => category.children, { nullable: true }) @JoinColumn({ name: "parent_id" }) parent!: Category | null;
  @OneToMany(() => Category, (category) => category.parent) children!: Category[];
}
