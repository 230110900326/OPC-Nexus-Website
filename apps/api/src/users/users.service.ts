import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthService } from "../auth/auth.service";
import { User } from "../database/entities/user.entity";
import { Post } from "../database/entities/post.entity";
import { Like } from "../database/entities/like.entity";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Like) private readonly likes: Repository<Like>,
    private readonly auth: AuthService,
  ) {}

  async getMe(id: string) { return this.auth.publicUser(await this.users.findOneOrFail({ where: { id }, relations: { roles: true } })); }

  async myPosts(userId: string) {
    const posts = await this.posts.find({
      where: { author: { id: userId } },
      relations: { section: true },
      order: { createdAt: "DESC" },
      take: 50,
    });
    const postIds = posts.map((p) => p.id);
    const likeCounts = postIds.length > 0
      ? await this.likes.createQueryBuilder("like")
          .select("like.targetId", "targetId")
          .addSelect("COUNT(*)", "count")
          .where("like.targetId IN (:...ids)", { ids: postIds })
          .andWhere("like.targetType = 'post'")
          .groupBy("like.targetId")
          .getRawMany<{ targetId: string; count: string }>()
      : [];
    const likeMap = new Map(likeCounts.map((r) => [r.targetId, Number(r.count)]));
    const items = posts.map((post) => ({
      ...post,
      _count: { comments: post.commentCount, likes: likeMap.get(post.id) ?? 0 },
    }));
    return { items };
  }

  async publicProfile(id: string) { const user = await this.users.findOne({ where: { id, isActive: true }, relations: { roles: true } }); if (!user) throw new NotFoundException("用户不存在或已停用"); return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, bio: user.bio, industry: user.industry, company: user.company, jobTitle: user.jobTitle, roles: user.roles.map((role) => role.name), createdAt: user.createdAt }; }

  async updateMe(id: string, input: UpdateProfileDto) {
    const user = await this.users.findOne({ where: { id }, relations: { roles: true } });
    if (!user) throw new NotFoundException("用户不存在");
    Object.assign(user, this.clean(input));
    return this.auth.publicUser(await this.users.save(user));
  }

  private clean(input: UpdateProfileDto) {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value.trim() || null : value]));
  }
}
