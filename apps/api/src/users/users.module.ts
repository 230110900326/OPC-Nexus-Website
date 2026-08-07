import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { User } from "../database/entities/user.entity";
import { Post } from "../database/entities/post.entity";
import { Like } from "../database/entities/like.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({ imports: [TypeOrmModule.forFeature([User, Post, Like]), AuthModule], controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}
