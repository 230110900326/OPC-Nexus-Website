import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SystemRole } from "../database/entities/role.entity";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: { roles: [SystemRole.EDITOR] } }) }),
  } as unknown as ExecutionContext;

  it("allows a user whose role matches the protected route", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([SystemRole.EDITOR]) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });

  it("denies a user without the required role", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([SystemRole.ADMIN]) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(context)).toBe(false);
  });
});
