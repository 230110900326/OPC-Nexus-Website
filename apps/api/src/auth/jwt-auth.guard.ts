import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthUser } from "./auth-user.interface";
import { User } from "../database/entities/user.entity";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, @InjectRepository(User) private readonly users: Repository<User>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthUser }>();
    const token = request.headers.authorization?.startsWith("Bearer ") ? request.headers.authorization.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("请先登录");
    try {
      request.user = await this.jwtService.verifyAsync<AuthUser>(token, { secret: process.env.JWT_ACCESS_SECRET });
      if (!await this.users.exists({ where: { id: request.user.id, isActive: true } })) throw new Error("Inactive user");
      return true;
    } catch {
      throw new UnauthorizedException("登录状态已失效");
    }
  }
}
