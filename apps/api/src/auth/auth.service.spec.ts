import { UnauthorizedException } from "@nestjs/common";
import { Repository } from "typeorm";
import { Role } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { AuthService } from "./auth.service";

describe("AuthService refresh failures", () => {
  const getOne = jest.fn();
  const query = { addSelect: jest.fn(), leftJoinAndSelect: jest.fn(), where: jest.fn(), getOne };
  for (const method of ["addSelect", "leftJoinAndSelect", "where"] as const) query[method].mockReturnValue(query);
  const users = { createQueryBuilder: jest.fn(() => query) } as unknown as Repository<User>;
  const jwt = { verifyAsync: jest.fn() };
  const config = { getOrThrow: jest.fn(() => "refresh-secret-with-at-least-32-characters") };
  const service = new AuthService(users, {} as Repository<Role>, jwt as never, config as never, { record: jest.fn() } as never, { sendPasswordResetEmail: jest.fn() } as never);

  beforeEach(() => { jest.clearAllMocks(); for (const method of ["addSelect", "leftJoinAndSelect", "where"] as const) query[method].mockReturnValue(query); });

  it("returns 401 for a missing or invalid refresh token", async () => {
    await expect(service.refresh()).rejects.toBeInstanceOf(UnauthorizedException);
    jwt.verifyAsync.mockRejectedValueOnce(new Error("invalid signature"));
    await expect(service.refresh("invalid-token")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(getOne).not.toHaveBeenCalled();
  });

  it("does not disguise a database outage as an authentication failure", async () => {
    const databaseError = new Error("database unavailable");
    jwt.verifyAsync.mockResolvedValueOnce({ id: "11111111-1111-4111-8111-111111111111", email: "user@example.com", roles: ["user"], type: "refresh" });
    getOne.mockRejectedValueOnce(databaseError);
    await expect(service.refresh("valid-token")).rejects.toBe(databaseError);
  });
});
