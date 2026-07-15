import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SystemRole } from "../database/entities/role.entity";
import { AuthUser } from "./auth-user.interface";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles?.length) return true;
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    return Boolean(user?.roles.some((role) => requiredRoles.includes(role)));
  }
}
