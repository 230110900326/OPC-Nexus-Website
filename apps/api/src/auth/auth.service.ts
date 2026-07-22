import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
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
  private readonly logger = new Logger(AuthService.name);
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

    const role = input.role || "user";

    // Block public operator registration — operators are pre-seeded or promoted by admins
    if (role === "operator") throw new BadRequestException("运营账号不可通过公开注册创建");

    if (role === "researcher") {
      // Validate researcher required fields
      if (!input.company?.trim() || !input.jobTitle?.trim() || !input.industry?.trim() || !input.bio?.trim()) {
        throw new BadRequestException("产业研究员注册需填写公司、职位、行业及认证说明");
      }
    }

    const userRole = await this.roles.findOneByOrFail({ name: SystemRole.USER });

    const user = this.users.create({
      email,
      displayName: input.displayName.trim(),
      passwordHash: await bcrypt.hash(input.password, 12),
      roles: [userRole],
      isActive: role !== "researcher",
      certificationStatus: role === "researcher" ? "pending" : null,
      company: input.company?.trim() || null,
      jobTitle: input.jobTitle?.trim() || null,
      industry: input.industry?.trim() || null,
      bio: input.bio?.trim() || null,
    });

    if (role === "researcher") {
      const researcherRole = await this.roles.findOneByOrFail({ name: SystemRole.RESEARCHER });
      user.roles.push(researcherRole);
    }

    return this.issueSession(await this.users.save(user));
  }

  async login(input: LoginDto) {
    const user = await this.users.createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .addSelect("user.certificationStatus")
      .addSelect("user.banReason")
      .leftJoinAndSelect("user.roles", "role")
      .where("user.email = :email", { email: input.email.trim().toLowerCase() })
      .getOne();

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("邮箱或密码不正确");
    }

    if (!user.isActive) {
      if (user.certificationStatus === "pending") throw new UnauthorizedException("你的账号正在审核中，审核通过后即可登录");
      if (user.certificationStatus === "rejected") throw new UnauthorizedException(`你的产业研究员认证未通过${user.banReason ? `：${user.banReason}` : "，如有疑问请联系运营"}`);
      throw new UnauthorizedException("该账号已被禁用");
    }
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

  async forgotPassword(email: string): Promise<{ message: string; devResetUrl?: string }> {
    const normalized = email.trim().toLowerCase();
    // Always return success to avoid email enumeration
    const user = await this.users.findOne({ where: { email: normalized } });
    if (!user) return { message: "如果该邮箱已注册，我们会发送一封密码重置邮件。" };

    const token = crypto.randomBytes(48).toString("hex");
    const expires = new Date(Date.now() + 3600_000); // 1 hour

    await this.users.update(user.id, { passwordResetToken: await bcrypt.hash(token, 12), passwordResetExpires: expires });

    const webOrigin = this.config.get<string>("WEB_ORIGIN", "http://localhost:3000");
    const resetUrl = `${webOrigin}/auth/reset-password?token=${token}&id=${user.id}`;

    let mailSent = false;
    try {
      await this.mail.sendPasswordResetEmail(user.email, resetUrl);
      mailSent = true;
    } catch (error) {
      this.logger.error(`Failed to send reset email to ${normalized}: ${(error as Error).message}`);
    }

    const smtpHost = this.config.get<string>("SMTP_HOST") || "";
    // In dev mode without real SMTP, return the reset URL so developers can test
    if (!smtpHost || !mailSent) {
      return { message: "如果该邮箱已注册，我们会发送一封密码重置邮件。", devResetUrl: resetUrl };
    }
    return { message: "如果该邮箱已注册，我们会发送一封密码重置邮件。" };
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
      refreshTokenHash: null,
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
    return { ...safeUser, roles: user.roles?.map((role) => role.name) ?? [], certificationStatus: user.certificationStatus ?? null };
  }
}
