import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
@Entity({ name: "tags" })
export class Tag { @PrimaryGeneratedColumn("uuid") id!: string; @Column({ unique: true, length: 80 }) slug!: string; @Column({ unique: true, length: 80 }) name!: string; }
