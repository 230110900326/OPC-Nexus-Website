import { Repository } from "typeorm";
import { ArticlesService } from "../articles/articles.service";
import { AuditService } from "../audit/audit.service";
import { Article } from "../database/entities/article.entity";
import { AuditLog } from "../database/entities/audit-log.entity";
import { Category } from "../database/entities/category.entity";
import { Comment } from "../database/entities/comment.entity";
import { CreatorAccount } from "../database/entities/creator-account.entity";
import { Creator } from "../database/entities/creator.entity";
import { ForumSection } from "../database/entities/forum-section.entity";
import { Post } from "../database/entities/post.entity";
import { Tag } from "../database/entities/tag.entity";
import { Video } from "../database/entities/video.entity";
import { VideoSyncLog } from "../database/entities/video-sync-log.entity";
import { ForumService } from "../forum/forum.service";
import { SearchContentType } from "../search/dto/search.dto";
import { SearchService } from "../search/search.service";
import { VideosService } from "../videos/videos.service";
import { OpcDemand } from "../database/entities/opc-demand.entity";
import { DemandsService } from "../demands/demands.service";
import { DemandSort } from "../demands/dto/list-demands.dto";

function queryBuilder() {
  const query = {
    leftJoinAndSelect: jest.fn(), where: jest.fn(), andWhere: jest.fn(), orderBy: jest.fn(), addOrderBy: jest.fn(),
    addSelect: jest.fn(), distinct: jest.fn(), skip: jest.fn(), take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]), getMany: jest.fn().mockResolvedValue([]),
  };
  for (const method of ["leftJoinAndSelect", "where", "andWhere", "orderBy", "addOrderBy", "addSelect", "distinct", "skip", "take"] as const) query[method].mockReturnValue(query);
  return query;
}

describe("TypeORM joined pagination ordering regressions", () => {
  it("orders article feeds with entity properties and a selected recommendation alias", async () => {
    const query = queryBuilder();
    const articles = { createQueryBuilder: jest.fn(() => query) } as unknown as Repository<Article>;
    const service = new ArticlesService(articles, {} as Repository<Category>, {} as Repository<Tag>, { recordDelta: jest.fn() } as never, { record: jest.fn() } as never);

    await service.list({ sort: "recommended", page: 1, limit: 9 });

    expect(query.addSelect).toHaveBeenCalledWith(expect.stringContaining("article.heat_score"), "recommendation_score");
    expect(query.orderBy).toHaveBeenCalledWith("recommendation_score", "DESC");
    expect(query.addOrderBy).toHaveBeenCalledWith("article.id", "DESC");
  });

  it("orders videos and forum posts with mapped entity properties", async () => {
    const videoQuery = queryBuilder();
    const videos = { createQueryBuilder: jest.fn(() => videoQuery) } as unknown as Repository<Video>;
    const videoService = new VideosService({} as Repository<Creator>, {} as Repository<CreatorAccount>, videos, {} as Repository<VideoSyncLog>);
    await videoService.list({});
    expect(videoQuery.orderBy).toHaveBeenCalledWith("video.publishedAt", "DESC");

    const postQuery = queryBuilder();
    const posts = { createQueryBuilder: jest.fn(() => postQuery) } as unknown as Repository<Post>;
    const forumService = new ForumService({} as Repository<ForumSection>, posts, {} as Repository<Comment>, { create: jest.fn() } as never, { recordDelta: jest.fn() } as never);
    await forumService.listPosts({ sort: "latest", page: 1, limit: 20 });
    expect(postQuery.orderBy).toHaveBeenCalledWith("post.isPinned", "DESC");
    expect(postQuery.addOrderBy).toHaveBeenCalledWith("post.createdAt", "DESC");
  });

  it("uses mapped secondary ordering for audit and search pagination", async () => {
    const auditQuery = queryBuilder();
    const audit = new AuditService({ createQueryBuilder: jest.fn(() => auditQuery) } as unknown as Repository<AuditLog>);
    await audit.list({ page: 1, limit: 20 });
    expect(auditQuery.orderBy).toHaveBeenCalledWith("audit.createdAt", "DESC");

    const postQuery = queryBuilder();
    const search = new SearchService({} as Repository<Article>, { createQueryBuilder: jest.fn(() => postQuery) } as unknown as Repository<Post>);
    await search.search({ q: "OPC", type: SearchContentType.POST, page: 1, limit: 12 });
    expect(postQuery.addSelect).toHaveBeenCalledWith(expect.stringContaining("ts_rank(post.search_document"), "search_rank");
    expect(postQuery.orderBy).toHaveBeenCalledWith("search_rank", "DESC");
    expect(postQuery.addOrderBy).toHaveBeenCalledWith("post.createdAt", "DESC");
  });

  it("orders joined demand pagination with mapped entity properties", async () => {
    const demandQuery = queryBuilder();
    const service = new DemandsService({ createQueryBuilder: jest.fn(() => demandQuery) } as unknown as Repository<OpcDemand>, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    await service.list({ sort: DemandSort.HOT, activeOnly: true, page: 1, limit: 20 });
    expect(demandQuery.orderBy).toHaveBeenCalledWith("demand.topWeight", "DESC");
    expect(demandQuery.addOrderBy).toHaveBeenCalledWith("demand.heatScore", "DESC");
    expect(demandQuery.addOrderBy).toHaveBeenCalledWith("demand.createdAt", "DESC");
  });
});
