import { BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { Article } from "../database/entities/article.entity";
import { Comment } from "../database/entities/comment.entity";
import { ModerationLog } from "../database/entities/moderation-log.entity";
import { Post } from "../database/entities/post.entity";
import { Report, ReportStatus, ReportTargetType } from "../database/entities/report.entity";
import { SystemRole } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { ModerationService } from "./moderation.service";

describe("ModerationService", () => {
  const report = { id: "11111111-1111-4111-8111-111111111111", targetType: ReportTargetType.POST, targetId: "22222222-2222-4222-8222-222222222222", status: ReportStatus.PENDING } as Report;
  const reports = { findOne: jest.fn().mockResolvedValue(report), save: jest.fn(async (value) => value) } as unknown as Repository<Report>;
  const logs = { create: jest.fn((value) => value), save: jest.fn() } as unknown as Repository<ModerationLog>;
  const posts = { update: jest.fn(), exists: jest.fn() } as unknown as Repository<Post>; const comments = { update: jest.fn(), exists: jest.fn() } as unknown as Repository<Comment>; const articles = { update: jest.fn(), exists: jest.fn() } as unknown as Repository<Article>; const users = { update: jest.fn(), exists: jest.fn() } as unknown as Repository<User>;
  const audit = { record: jest.fn() };
  const service = new ModerationService(reports, logs, posts, comments, articles, users, { create: jest.fn() } as never, audit as never); const actor = { id: "33333333-3333-4333-8333-333333333333", email: "mod@example.com", roles: [SystemRole.MODERATOR] };
  beforeEach(() => { jest.clearAllMocks(); report.status = ReportStatus.PENDING; (reports.findOne as jest.Mock).mockResolvedValue(report); });
  it("does not allow a rejected report to mutate content", async () => { await expect(service.resolve(report.id, { status: ReportStatus.REJECTED, action: "hide", resolution: "证据不足" }, actor)).rejects.toBeInstanceOf(BadRequestException); expect(posts.update).not.toHaveBeenCalled(); });
  it("hides a reported post and writes both moderation and admin audit logs", async () => { await service.resolve(report.id, { status: ReportStatus.RESOLVED, action: "hide", resolution: "违反社区规则" }, actor); expect(posts.update).toHaveBeenCalled(); expect(logs.save).toHaveBeenCalled(); expect(audit.record).toHaveBeenCalled(); expect(report.status).toBe(ReportStatus.RESOLVED); });
});
