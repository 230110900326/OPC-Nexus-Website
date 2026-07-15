import "reflect-metadata";
import { DataSource } from "typeorm";
import { Permission } from "./entities/permission.entity";
import { Role } from "./entities/role.entity";
import { User } from "./entities/user.entity";
import { InitialAccountSchema1710000000000 } from "./migrations/1710000000000-initial-account-schema";
import { ContentSchema1710000001000 } from "./migrations/1710000001000-content-schema";
import { ContentCompletion1710000002000 } from "./migrations/1710000002000-content-completion";
import { CommunitySchema1710000003000 } from "./migrations/1710000003000-community-schema";
import { EventsNotifications1710000004000 } from "./migrations/1710000004000-events-notifications";
import { Category } from "./entities/category.entity";
import { Tag } from "./entities/tag.entity";
import { Article } from "./entities/article.entity";
import { ArticleSource } from "./entities/article-source.entity";
import { Comment } from "./entities/comment.entity";
import { Favorite } from "./entities/favorite.entity";
import { Follow } from "./entities/follow.entity";
import { ForumSection } from "./entities/forum-section.entity";
import { Like } from "./entities/like.entity";
import { ModerationLog } from "./entities/moderation-log.entity";
import { Post } from "./entities/post.entity";
import { Report } from "./entities/report.entity";
import { Event } from "./entities/event.entity";
import { EventRegistration } from "./entities/event-registration.entity";
import { Notification } from "./entities/notification.entity";

export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? "opc",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? "opc_nexus",
  entities: [User, Role, Permission, Category, Tag, Article, ArticleSource, ForumSection, Post, Comment, Like, Favorite, Follow, Report, ModerationLog, Event, EventRegistration, Notification],
  migrations: [InitialAccountSchema1710000000000, ContentSchema1710000001000, ContentCompletion1710000002000, CommunitySchema1710000003000, EventsNotifications1710000004000],
  synchronize: false,
});
