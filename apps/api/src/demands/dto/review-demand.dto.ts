import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export enum DemandReviewAction { APPROVE = "approve", REJECT = "reject", BLOCK = "block" }
export class ReviewDemandDto { @IsEnum(DemandReviewAction) action!: DemandReviewAction; @IsOptional() @IsString() @Length(2, 1000) reason?: string; }

export enum DemandBatchAction { APPROVE = "approve", REJECT = "reject", PIN = "pin", UNPIN = "unpin", OFFLINE = "offline", BLOCK = "block" }
export class BatchDemandActionDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @IsUUID(undefined, { each: true }) ids!: string[];
  @IsEnum(DemandBatchAction) action!: DemandBatchAction;
  @IsOptional() @IsString() @Length(2, 1000) reason?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10_000) topWeight?: number;
}
