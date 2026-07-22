import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { DataSource } from "typeorm";

@Controller("health")
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  check() {
    return { success: true, data: { service: "opc-api", status: "ok", timestamp: new Date().toISOString() } };
  }

  @Get("ready")
  async ready() {
    try {
      await this.dataSource.query("SELECT 1");
      return { success: true, data: { service: "opc-api", status: "ready", database: "ok", timestamp: new Date().toISOString() } };
    } catch {
      throw new ServiceUnavailableException({ service: "opc-api", status: "not-ready", database: "unavailable" });
    }
  }
}
