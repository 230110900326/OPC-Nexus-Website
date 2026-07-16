import { IsInt, IsOptional, IsString, IsUrl, Max, Min } from "class-validator";
export class RecordLinkCheckDto { @IsOptional() @IsInt() @Min(100) @Max(599) statusCode?: number | null; @IsOptional() @IsUrl({ require_tld: false }) redirectUrl?: string; @IsOptional() @IsString() errorMessage?: string; }
