import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsString, IsUUID, MaxLength } from "class-validator";
import { RecommendationEventType } from "../../database/entities/recommendation-event.entity";

export class TrackRecommendationDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @IsUUID(undefined, { each: true }) configIds!: string[];
  @IsEnum(RecommendationEventType) eventType!: RecommendationEventType;
  @IsString() @MaxLength(240) pagePath = "/";
}
