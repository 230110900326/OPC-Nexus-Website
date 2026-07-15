import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { SystemRole, Role } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { AuthUser } from "./auth-user.interface";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.exists({ where: { email } })) throw new ConflictException("该邮箱已注册");
    const userRole = await this.roles.findOneByOrFail({ name: SystemRole.USER });
    const user = this.users.create({ email, displayName: input.displayName.trim(), passwordHash: await bcrypt.hash(input.password, 12), roles: [userRole] });
    return this.issueSession(await this.users.save(user));
  }

  async login(input: LoginDto) {
    const user = await this.users.createQueryBuilder("user").addSelect("user.passwordHash").leftJoinAndSelect("user.roles", "role").where("user.email = :email", { email: input.email.trim().toLowerCase() }).getOne();
    if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) throw new UnauthorizedException("邮箱或密码不正确");
    return this.issueSession(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<AuthUser & { type: string }>(refreshToken, { secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET") });
      if (payload.type !== "refresh") throw new Error("Unexpected token");
      const user = await this.users.createQueryBuilder("user").addSelect("user.refreshTokenHash").leftJoinAndSelect("user.roles", "role").where("user.id = :id", { id: payload.id }).getOne();
      if (!user?.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) throw new Error("Invalid token");
      return this.issueSession(user);
    } catch {
      throw new UnauthorizedException("登录状态已失效，请重新登录");
    }
  }

  async logout(userId: string) { await this.users.update(userId, { refreshTokenHash: null }); }

  async getProfile(userId: string) { return this.users.findOneOrFail({ where: { id: userId }, relations: { roles: true } }); }

  private async issueSession(user: User) {
    const roles = user.roles.map((role) => role.name);
    const payload: AuthUser = { id: user.id, email: user.email, roles };
    const accessToken = await this.jwtService.signAsync(payload, { secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"), expiresIn: this.config.get<string>("JWT_ACCESS_TTL", "15m") });
    const refreshToken = await this.jwtService.signAsync({ ...payload, type: "refresh" }, { secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"), expiresIn: this.config.get<string>("JWT_REFRESH_TTL", "7d") });
    await this.users.update(user.id, { refreshTokenHash: await bcrypt.hash(refreshToken, 12) });
    return { accessToken, refreshToken, user: this.publicUser(user) };
  }

  public publicUser(user: User) {
    const { passwordHash: _, refreshTokenHash: __, ...safeUser } = user;
    return { ...safeUser, roles: user.roles?.map((role) => role.name) ?? [] };
  }
}
