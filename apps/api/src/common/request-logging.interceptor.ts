import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, tap } from "rxjs";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = performance.now();
    const write = (outcome: "ok" | "error", error?: unknown) => {
      const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
      const message = `method=${request.method} path=${request.originalUrl} status=${response.statusCode} duration_ms=${durationMs} outcome=${outcome}`;
      if (outcome === "error") this.logger.error(message, error instanceof Error ? error.stack : undefined);
      else if (durationMs >= 1_000) this.logger.warn(`${message} slow=true`);
      else this.logger.log(message);
    };
    return next.handle().pipe(tap({ next: () => write("ok"), error: (error) => write("error", error) }));
  }
}
