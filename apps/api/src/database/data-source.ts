import "reflect-metadata";
import { DataSource } from "typeorm";
import { Permission } from "./entities/permission.entity";
import { Role } from "./entities/role.entity";
import { User } from "./entities/user.entity";
import { InitialAccountSchema1710000000000 } from "./migrations/1710000000000-initial-account-schema";
import { ContentSchema1710000001000 } from "./migrations/1710000001000-content-schema";
import { Category } from "./entities/category.entity";
import { Tag } from "./entities/tag.entity";
import { Article } from "./entities/article.entity";
import { ArticleSource } from "./entities/article-source.entity";

export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? "opc",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? "opc_nexus",
  entities: [User, Role, Permission, Category, Tag, Article, ArticleSource],
  migrations: [InitialAccountSchema1710000000000, ContentSchema1710000001000],
  synchronize: false,
});
