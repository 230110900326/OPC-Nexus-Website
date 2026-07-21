import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CrawlerRunnerService {
  constructor(private readonly config: ConfigService) {}

  async runNow(sourceId?: string) {
    const baseUrl = this.config.get<string>("CRAWLER_SERVICE_URL");
    const token = this.config.get<string>("CRAWLER_API_TOKEN");
    if (!baseUrl || !token) throw new ServiceUnavailableException("采集服务尚未配置");
    let response: Response;
    try {
      response = await fetch(new URL("/runs", baseUrl), { method: "POST", headers: { "Content-Type": "application/json", "x-crawler-token": token }, body: JSON.stringify({ sourceId }), signal: AbortSignal.timeout(120_000) });
    } catch { throw new BadGatewayException("无法连接采集服务"); }
    const body = await response.json().catch(() => null) as { success?: boolean; data?: unknown; error?: { message?: string } } | null;
    if (!response.ok || !body?.success) throw new BadGatewayException(body?.error?.message ?? "采集服务执行失败");
    return body.data;
  }
}
