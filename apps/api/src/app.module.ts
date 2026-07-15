import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import * as Joi from "joi";
import { AuthModule } from "./auth/auth.module";
import { Permission } from "./database/entities/permission.entity";
import { Role } from "./database/entities/role.entity";
import { User } from "./database/entities/user.entity";
import { HealthController } from "./health/health.controller";
import { UsersModule } from "./users/users.module";
import { Category } from "./database/entities/category.entity";
import { Tag } from "./database/entities/tag.entity";
import { Article } from "./database/entities/article.entity";
import { ArticleSource } from "./database/entities/article-source.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        API_PORT: Joi.number().port().default(4000), WEB_ORIGIN: Joi.string().uri().default("http://localhost:3000"),
        DB_HOST: Joi.string().hostname().default("localhost"), DB_PORT: Joi.number().port().default(5432),
        DB_NAME: Joi.string().default("opc_nexus"), DB_USER: Joi.string().default("opc"), DB_PASSWORD: Joi.string().min(1).required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(), JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_TTL: Joi.string().default("15m"), JWT_REFRESH_TTL: Joi.string().default("7d"),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRoot({
      type: "postgres", host: process.env.DB_HOST, port: Number(process.env.DB_PORT), username: process.env.DB_USER,
      password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [User, Role, Permission, Category, Tag, Article, ArticleSource], synchronize: false,
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
