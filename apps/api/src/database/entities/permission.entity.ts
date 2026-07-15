import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Role } from "./role.entity";

@Entity({ name: "permissions" })
export class Permission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, type: "varchar", length: 80 })
  code!: string;

  @Column({ type: "varchar", length: 160 })
  description!: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
