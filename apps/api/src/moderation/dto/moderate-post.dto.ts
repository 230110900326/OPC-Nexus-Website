import { IsIn, IsString, Length } from "class-validator";
export class ModeratePostDto { @IsIn(["hide", "restore", "lock", "unlock", "pin", "unpin", "feature", "unfeature"]) action!: "hide" | "restore" | "lock" | "unlock" | "pin" | "unpin" | "feature" | "unfeature"; @IsString() @Length(2, 500) reason!: string; }
