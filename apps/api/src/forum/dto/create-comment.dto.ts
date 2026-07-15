import { IsOptional, IsString, IsUUID, Length } from "class-validator";
export class CreateCommentDto { @IsString() @Length(1, 5000) body!: string; @IsOptional() @IsUUID() parentId?: string; }
