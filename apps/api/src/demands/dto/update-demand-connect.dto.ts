import { IsEnum } from "class-validator";
import { DemandConnectStatus } from "../../database/entities/opc-demand-connect.entity";
export class UpdateDemandConnectDto { @IsEnum(DemandConnectStatus) status!: DemandConnectStatus; }
