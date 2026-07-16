import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthService } from "../auth/auth.service";
import { User } from "../database/entities/user.entity";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>, private readonly auth: AuthService) {}
  async getMe(id: string) { return this.auth.publicUser(await this.users.findOneOrFail({ where: { id }, relations: { roles: true } })); }
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
