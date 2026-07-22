import { ConfigService } from "@nestjs/config";
import { CookieOptions } from "express";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

function controllerFor(values: Record<string, string | boolean | undefined>) {
  const config = { get: jest.fn((key: string, defaultValue?: unknown) => values[key] ?? defaultValue) } as unknown as ConfigService;
  return new AuthController({} as AuthService, config);
}

function cookieOptions(controller: AuthController) {
  return (controller as unknown as { cookieOptions: () => CookieOptions }).cookieOptions();
}

describe("AuthController refresh cookie", () => {
  it("defaults to a narrow strict-same-site refresh cookie", () => {
    expect(cookieOptions(controllerFor({ NODE_ENV: "development" }))).toEqual(expect.objectContaining({ httpOnly: true, sameSite: "strict", secure: false, path: "/auth" }));
  });

  it("allows local Docker to disable secure cookies explicitly", () => {
    expect(cookieOptions(controllerFor({ NODE_ENV: "production", COOKIE_SECURE: false, REFRESH_COOKIE_PATH: "/" })).secure).toBe(false);
  });

  it("keeps secure cookies as the production fallback", () => {
    expect(cookieOptions(controllerFor({ NODE_ENV: "production" })).secure).toBe(true);
  });
});
