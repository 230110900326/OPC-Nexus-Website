import { ArgumentsHost, Logger } from "@nestjs/common";
import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
  it("logs an unhandled exception without exposing it in the response", () => {
    const response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    const request = { method: "GET", url: "/articles" };
    const host = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }) } as unknown as ArgumentsHost;
    const logger = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    new HttpExceptionFilter().catch(new Error("database password must stay private"), host);

    expect(logger).toHaveBeenCalledWith("Unhandled exception during GET /articles", expect.stringContaining("database password must stay private"));
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: expect.objectContaining({ code: "INTERNAL_SERVER_ERROR", message: "服务暂时不可用" }) }));
    logger.mockRestore();
  });
});
