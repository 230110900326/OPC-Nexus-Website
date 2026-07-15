import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Article } from "./article.entity";
@Entity({ name: "article_sources" })
export class ArticleSource { @PrimaryGeneratedColumn("uuid") id!: string; @ManyToOne(() => Article, { onDelete: "CASCADE" }) article!: Article; @Column({ length: 160 }) name!: string; @Column({ length: 1000 }) url!: string; @Column({ name: "is_primary", default: true }) isPrimary!: boolean; }
