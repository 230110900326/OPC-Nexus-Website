import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { User } from "../database/entities/user.entity";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard active-user check", () => {
  const request = { headers: { authorization: "Bearer valid" }, user: undefined as unknown };
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  const jwt = { verifyAsync: jest.fn().mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", email: "u@example.com", roles: ["user"] }) } as unknown as JwtService;
  const users = { exists: jest.fn() } as unknown as Repository<User>;
  const guard = new JwtAuthGuard(jwt, users);
  beforeEach(() => jest.clearAllMocks());
  it("accepts an active user", async () => { (users.exists as jest.Mock).mockResolvedValue(true); await expect(guard.canActivate(context)).resolves.toBe(true); });
  it("invalidates an existing token after the user is banned", async () => { (users.exists as jest.Mock).mockResolvedValue(false); await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException); });
});
