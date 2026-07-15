import { IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { PostStatus } from "../../database/entities/post.entity";
export class UpdatePostDto {
  @IsOptional() @IsString() @Length(4, 180) title?: string;
  @IsOptional() @IsString() @Length(10, 30000) body?: string;
  @IsOptional() @IsUUID() sectionId?: string;
  @IsOptional() @IsIn([PostStatus.DRAFT, PostStatus.PUBLISHED]) status?: PostStatus;
}
