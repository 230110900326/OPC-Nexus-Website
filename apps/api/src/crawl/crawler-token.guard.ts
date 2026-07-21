import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import { Request } from "express";

@Injectable()
export class CrawlerTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const expected = this.config.get<string>("CRAWLER_API_TOKEN");
    if (!expected) throw new ServiceUnavailableException("采集服务令牌尚未配置");
    const received = context.switchToHttp().getRequest<Request>().header("x-crawler-token") ?? "";
    const expectedValue = Buffer.from(expected);
    const receivedValue = Buffer.from(received);
    if (expectedValue.length !== receivedValue.length || !timingSafeEqual(expectedValue, receivedValue)) throw new UnauthorizedException("采集服务身份验证失败");
    return true;
  }
}
