import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser } from "./auth-user.interface";

export const AuthenticatedUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthUser => {
  return context.switchToHttp().getRequest().user as AuthUser;
});
