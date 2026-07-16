import { BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { Article } from "../database/entities/article.entity";
import { Comment } from "../database/entities/comment.entity";
import { Favorite } from "../database/entities/favorite.entity";
import { Follow, FollowTargetType } from "../database/entities/follow.entity";
import { Like, LikeTargetType } from "../database/entities/like.entity";
import { Post } from "../database/entities/post.entity";
import { User } from "../database/entities/user.entity";
import { Video } from "../database/entities/video.entity";
import { Creator } from "../database/entities/creator.entity";
import { InteractionsService } from "./interactions.service";
import { OpcDemand } from "../database/entities/opc-demand.entity";

describe("InteractionsService", () => {
  const likes = { exists: jest.fn(), create: jest.fn((value) => value), save: jest.fn(), count: jest.fn().mockResolvedValue(1), delete: jest.fn() } as unknown as Repository<Like>;
  const favorites = { exists: jest.fn(), create: jest.fn((value) => value), save: jest.fn(), count: jest.fn(), delete: jest.fn() } as unknown as Repository<Favorite>;
  const follows = { exists: jest.fn(), create: jest.fn((value) => value), save: jest.fn(), count: jest.fn().mockResolvedValue(1), delete: jest.fn() } as unknown as Repository<Follow>;
  const articles = { exists: jest.fn().mockResolvedValue(true) } as unknown as Repository<Article>; const posts = { exists: jest.fn().mockResolvedValue(true) } as unknown as Repository<Post>; const comments = { exists: jest.fn().mockResolvedValue(true) } as unknown as Repository<Comment>; const users = { exists: jest.fn().mockResolvedValue(true), findOneBy: jest.fn() } as unknown as Repository<User>; const videos = { exists: jest.fn().mockResolvedValue(true) } as unknown as Repository<Video>; const creators = { exists: jest.fn().mockResolvedValue(true) } as unknown as Repository<Creator>;
  const demands = { exists: jest.fn().mockResolvedValue(true) } as unknown as Repository<OpcDemand>;
  const service = new InteractionsService(likes, favorites, follows, articles, posts, comments, users, videos, creators, demands, { inspect: jest.fn().mockResolvedValue({ allowed: true, reason: null }) } as never, { recordDelta: jest.fn() } as never);
  beforeEach(() => jest.clearAllMocks());
  it("does not create a duplicate like", async () => { (likes.exists as jest.Mock).mockResolvedValue(true); await service.addLike("11111111-1111-4111-8111-111111111111", LikeTargetType.POST, "22222222-2222-4222-8222-222222222222"); expect(likes.save).not.toHaveBeenCalled(); });
  it("accepts interactions for a published video", async () => { (likes.exists as jest.Mock).mockResolvedValue(false); await service.addLike("11111111-1111-4111-8111-111111111111", LikeTargetType.VIDEO, "22222222-2222-4222-8222-222222222222"); expect(likes.save).toHaveBeenCalled(); });
  it("prevents users from following themselves", async () => { await expect(service.addFollow("11111111-1111-4111-8111-111111111111", FollowTargetType.USER, "11111111-1111-4111-8111-111111111111")).rejects.toBeInstanceOf(BadRequestException); });
});
