import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DemandStatus, OpcDemand } from "../database/entities/opc-demand.entity";
import { percentile } from "../ranking/heat-score";
import { isVerifiedDemandAuthor } from "./demand-compliance.service";

@Injectable()
export class DemandHeatService {
  constructor(@InjectRepository(OpcDemand) private readonly demands: Repository<OpcDemand>) {}

  async recalculate(id: string, now = new Date()) {
    const demand = await this.demands.findOne({ where: { id }, relations: { author: { roles: true } } });
    if (!demand) throw new NotFoundException("需求不存在");
    const peers = await this.demands.find({ where: { status: DemandStatus.PUBLISHED } });
    const heat = calculateDemandHeat(demand, peers, now, isVerifiedDemandAuthor(demand.author));
    demand.heatScore = heat;
    await this.demands.save(demand);
    return heat;
  }

  async recalculatePublished(now = new Date()) {
    const values = await this.demands.find({ where: { status: DemandStatus.PUBLISHED }, relations: { author: { roles: true } } });
    for (const demand of values) demand.heatScore = calculateDemandHeat(demand, values, now, isVerifiedDemandAuthor(demand.author));
    if (values.length) await this.demands.save(values);
    return { updated: values.length };
  }
}

export function calculateDemandHeat(demand: Pick<OpcDemand, "viewCount" | "connectCount" | "createdAt" | "riskFlags">, peers: Pick<OpcDemand, "viewCount" | "connectCount">[], now = new Date(), verified = false) {
  const viewScore = percentile(demand.viewCount, peers.map((item) => item.viewCount));
  const connectScore = percentile(demand.connectCount, peers.map((item) => item.connectCount));
  const ageDays = Math.max(0, (now.getTime() - demand.createdAt.getTime()) / 86_400_000);
  const freshness = Math.pow(0.5, ageDays / 7);
  const raw = (0.4 * viewScore + 0.4 * connectScore + 0.2 * freshness) * 100 + (verified ? 3 : 0);
  const riskMultiplier = demand.riskFlags.length ? 0.6 : 1;
  return Math.round(raw * riskMultiplier * 100) / 100;
}
