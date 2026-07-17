import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { SystemRole, Role } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { AuthUser } from "./auth-user.interface";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../database/entities/audit-log.entity";
import { MailService } from "../mail/mail.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
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
    const session = await this.issueSession(user);
    if (user.roles.some((role) => role.name !== SystemRole.USER)) await this.audit.record({ actor: user, action: AuditAction.ADMIN_LOGIN, targetType: "session", metadata: { roles: user.roles.map((role) => role.name) } });
    return session;
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) throw this.invalidSession();
    let payload: AuthUser & { type: string };
    try {
      payload = await this.jwtService.verifyAsync<AuthUser & { type: string }>(refreshToken, { secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET") });
    } catch {
      throw this.invalidSession();
    }
    if (payload.type !== "refresh") throw this.invalidSession();
    const user = await this.users.createQueryBuilder("user").addSelect("user.refreshTokenHash").leftJoinAndSelect("user.roles", "role").where("user.id = :id", { id: payload.id }).getOne();
    if (!user?.isActive || !user.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) throw this.invalidSession();
    return this.issueSession(user);
  }

  async logout(userId: string) { await this.users.update(userId, { refreshTokenHash: null }); }

  async getProfile(userId: string) { return this.users.findOneOrFail({ where: { id: userId }, relations: { roles: true } }); }

  async forgotPassword(email: string) {
    const normalized = email.trim().toLowerCase();
    // Always return success to avoid email enumeration
    const user = await this.users.findOne({ where: { email: normalized } });
    if (!user) return;

    const token = crypto.randomBytes(48).toString("hex");
    const expires = new Date(Date.now() + 3600_000); // 1 hour

    await this.users.update(user.id, { passwordResetToken: await bcrypt.hash(token, 12), passwordResetExpires: expires });

    const webOrigin = this.config.get<string>("WEB_ORIGIN", "http://localhost:3000");
    const resetUrl = `${webOrigin}/auth/reset-password?token=${token}&id=${user.id}`;

    await this.mail.sendPasswordResetEmail(user.email, resetUrl);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.users.createQueryBuilder("user")
      .addSelect("user.passwordResetToken")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id: dto.userId })
      .getOne();

    if (!user?.passwordResetToken || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException("重置链接已过期或无效，请重新发起找回密码请求。");
    }

    if (!(await bcrypt.compare(dto.token, user.passwordResetToken))) {
      throw new BadRequestException("重置链接已过期或无效，请重新发起找回密码请求。");
    }

    await this.users.update(user.id, {
      passwordHash: await bcrypt.hash(dto.password, 12),
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  private async issueSession(user: User) {
    const roles = user.roles.map((role) => role.name);
    const payload: AuthUser = { id: user.id, email: user.email, roles };
    const accessToken = await this.jwtService.signAsync(payload, { secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"), expiresIn: this.config.get<string>("JWT_ACCESS_TTL", "15m") });
    const refreshToken = await this.jwtService.signAsync({ ...payload, type: "refresh" }, { secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"), expiresIn: this.config.get<string>("JWT_REFRESH_TTL", "7d") });
    await this.users.update(user.id, { refreshTokenHash: await bcrypt.hash(refreshToken, 12) });
    return { accessToken, refreshToken, user: this.publicUser(user) };
  }

  private invalidSession() { return new UnauthorizedException("登录状态已失效，请重新登录"); }

  public publicUser(user: User) {
    const { passwordHash: _, refreshTokenHash: __, banReason: ___, bannedAt: ____, ...safeUser } = user;
    return { ...safeUser, roles: user.roles?.map((role) => role.name) ?? [] };
  }
}
