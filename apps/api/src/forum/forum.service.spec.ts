import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Repository } from "typeorm";
import { Comment, CommentStatus } from "../database/entities/comment.entity";
import { ForumSection } from "../database/entities/forum-section.entity";
import { Post, PostStatus } from "../database/entities/post.entity";
import { SystemRole } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { ForumService } from "./forum.service";

describe("ForumService", () => {
  const section = { id: "11111111-1111-4111-8111-111111111111", name: "资本市场", slug: "capital-markets", isActive: true } as ForumSection;
  const author = { id: "22222222-2222-4222-8222-222222222222", displayName: "研究员", avatarUrl: null, industry: "金融", company: null, jobTitle: "分析师" } as User;
  const user = { id: author.id, email: "a@example.com", roles: [SystemRole.USER] };
  const sections = { findOneBy: jest.fn().mockResolvedValue(section) } as unknown as Repository<ForumSection>;
  const posts = { create: jest.fn((value) => value), save: jest.fn(async (value) => ({ ...value, id: "33333333-3333-4333-8333-333333333333", createdAt: new Date(), updatedAt: new Date(), viewCount: 0, commentCount: 0, heatScore: 0, isLocked: false, isPinned: false, isFeatured: false })), findOneOrFail: jest.fn(), findOne: jest.fn(), findOneBy: jest.fn(), increment: jest.fn() } as unknown as Repository<Post>;
  const comments = { find: jest.fn(), findOne: jest.fn(), findOneOrFail: jest.fn(), create: jest.fn((value) => value), save: jest.fn() } as unknown as Repository<Comment>;
  const service = new ForumService(sections, posts, comments, { create: jest.fn() } as never);
  beforeEach(() => jest.clearAllMocks());
  it("reloads a new post so the API returns complete author data", async () => { (posts.findOneOrFail as jest.Mock).mockResolvedValue({ id: "33333333-3333-4333-8333-333333333333", title: "市场结构变化", body: "这是一段足够长的讨论正文。", status: PostStatus.PUBLISHED, section, author, createdAt: new Date(), updatedAt: new Date(), viewCount: 0, commentCount: 0, heatScore: 0, isLocked: false, isPinned: false, isFeatured: false }); const result = await service.create({ title: "市场结构变化", body: "这是一段足够长的讨论正文。", sectionId: section.id, status: PostStatus.PUBLISHED }, user); expect(result.author.displayName).toBe("研究员"); });
  it("prevents a different user from editing a post", async () => { (posts.findOne as jest.Mock).mockResolvedValue({ id: "p", author: { id: "someone-else" }, section, status: PostStatus.PUBLISHED }); await expect(service.update("33333333-3333-4333-8333-333333333333", { title: "修改后的标题" }, user)).rejects.toBeInstanceOf(ForbiddenException); });
  it("prevents comments on locked posts", async () => { (posts.findOne as jest.Mock).mockResolvedValue({ id: "p", isLocked: true, author }); await expect(service.createComment("33333333-3333-4333-8333-333333333333", { body: "回复" }, user)).rejects.toBeInstanceOf(BadRequestException); });
  it("returns nested comments as a tree", async () => { const post = { id: "33333333-3333-4333-8333-333333333333", title: "标题", body: "正文", status: PostStatus.PUBLISHED, section, author, createdAt: new Date(), updatedAt: new Date(), viewCount: 0, commentCount: 2, heatScore: 0, isLocked: false, isPinned: false, isFeatured: false } as Post; const root = { id: "44444444-4444-4444-8444-444444444444", body: "根评论", status: CommentStatus.PUBLISHED, author, parent: null, createdAt: new Date(), updatedAt: new Date() } as Comment; const child = { id: "55555555-5555-4555-8555-555555555555", body: "子回复", status: CommentStatus.PUBLISHED, author, parent: root, createdAt: new Date(), updatedAt: new Date() } as Comment; (posts.findOne as jest.Mock).mockResolvedValue(post); (comments.find as jest.Mock).mockResolvedValue([root, child]); const result = await service.detail(post.id); expect(result.comments[0].children[0].body).toBe("子回复"); });
});
