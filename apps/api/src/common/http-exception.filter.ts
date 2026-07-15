import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const details = isHttpException ? exception.getResponse() : undefined;
    const message = typeof details === "object" && details && "message" in details ? (Array.isArray(details.message) ? details.message.join("; ") : String(details.message)) : "服务暂时不可用";
    response.status(status).json({ success: false, error: { code: HttpStatus[status] ?? "INTERNAL_SERVER_ERROR", message }, meta: { path: request.url, timestamp: new Date().toISOString() } });
  }
}
