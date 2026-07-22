import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Permission } from "./permission.entity";

export enum SystemRole {
  USER = "user",
  RESEARCHER = "researcher",
  EDITOR = "editor",
  MODERATOR = "moderator",
  OPERATOR = "operator",
  ADMIN = "admin",
}

@Entity({ name: "roles" })
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, type: "varchar", length: 32 })
  name!: SystemRole;

  @Column({ type: "varchar", length: 80 })
  label!: string;

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: "role_permissions",
    joinColumn: { name: "role_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permission_id", referencedColumnName: "id" },
  })
  permissions!: Permission[];
}
