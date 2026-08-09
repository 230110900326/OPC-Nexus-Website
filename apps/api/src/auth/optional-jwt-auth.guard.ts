import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthUser } from "./auth-user.interface";
import { User } from "../database/entities/user.entity";

/** 可选登录守卫：携带合法 token 时填充 request.user；无 token 或 token 无效时按匿名请求放行。 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, @InjectRepository(User) private readonly users: Repository<User>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthUser }>();
    const token = request.headers.authorization?.startsWith("Bearer ") ? request.headers.authorization.slice(7) : undefined;
    if (!token) return true;
    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token, { secret: process.env.JWT_ACCESS_SECRET });
      if (await this.users.exists({ where: { id: payload.id, isActive: true } })) request.user = payload;
    } catch { /* token 无效按匿名处理 */ }
    return true;
  }
}
