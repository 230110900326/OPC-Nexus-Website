import { IsString, Length } from "class-validator";
export class CreateDemandConnectDto { @IsString() @Length(10, 1000) applyMsg!: string; }
