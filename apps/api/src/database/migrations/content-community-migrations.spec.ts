import { QueryRunner } from "typeorm";
import { ContentCompletion1710000002000 } from "./1710000002000-content-completion";
import { CommunitySchema1710000003000 } from "./1710000003000-community-schema";

describe("stage C and D migrations", () => {
  const statements: string[] = []; const runner = { query: jest.fn(async (sql: string) => { statements.push(sql); }) } as unknown as QueryRunner;
  beforeEach(() => { statements.length = 0; jest.clearAllMocks(); });
  it("adds article full-text search and content integrity indexes", async () => { await new ContentCompletion1710000002000().up(runner); const sql = statements.join("\n"); expect(sql).toContain("search_document"); expect(sql).toContain("USING GIN"); expect(sql).toContain("IDX_tags_name_unique"); expect(sql).toContain("IDX_article_sources_one_primary"); });
  it("creates the complete community, interaction and moderation schema", async () => { await new CommunitySchema1710000003000().up(runner); const sql = statements.join("\n"); for (const table of ["forum_sections", "posts", "comments", "likes", "favorites", "follows", "reports", "moderation_logs"]) expect(sql).toContain(`CREATE TABLE \"${table}\"`); expect(sql).toContain("宏观与政策"); expect(sql).toContain("IDX_posts_search"); });
});
