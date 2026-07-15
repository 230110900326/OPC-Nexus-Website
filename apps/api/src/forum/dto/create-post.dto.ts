import { IsIn, IsString, IsUUID, Length, MaxLength } from "class-validator";
import { PostStatus } from "../../database/entities/post.entity";
export class CreatePostDto {
  @IsString() @Length(4, 180) title!: string;
  @IsString() @Length(10, 30000) body!: string;
  @IsUUID() sectionId!: string;
  @IsIn([PostStatus.DRAFT, PostStatus.PUBLISHED]) status: PostStatus = PostStatus.PUBLISHED;
}
