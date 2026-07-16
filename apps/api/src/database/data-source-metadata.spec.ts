import dataSource from "./data-source";

describe("TypeORM metadata", () => {
  it("resolves every stage A-J entity relation", async () => {
    await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();
    const tables = dataSource.entityMetadatas.map((metadata) => metadata.tableName);
    for (const table of ["articles", "article_sources", "forum_sections", "posts", "comments", "likes", "favorites", "follows", "reports", "moderation_logs", "events", "event_registrations", "notifications", "crawl_sources", "crawl_jobs", "crawl_logs", "creators", "creator_accounts", "videos", "video_sync_logs", "content_metrics", "interaction_audits", "homepage_configs", "recommendation_events", "audit_logs", "opc_demands", "opc_demand_connect", "demand_board_configs"]) expect(tables).toContain(table);
    expect(dataSource.getMetadata("posts").relations.map((relation) => relation.propertyName)).toEqual(expect.arrayContaining(["section", "author", "comments"]));
    expect(dataSource.getMetadata("comments").relations.map((relation) => relation.propertyName)).toEqual(expect.arrayContaining(["post", "author", "parent", "children"]));
    const relationColumn = (table: string, relation: string) => dataSource.getMetadata(table).relations.find((value) => value.propertyName === relation)?.joinColumns[0]?.databaseName;
    expect(relationColumn("articles", "category")).toBe("category_id");
    expect(relationColumn("articles", "operator")).toBe("operator_id");
    expect(relationColumn("article_sources", "article")).toBe("article_id");
    expect(relationColumn("posts", "section")).toBe("section_id");
    expect(relationColumn("posts", "author")).toBe("author_id");
    expect(relationColumn("comments", "post")).toBe("post_id");
    expect(relationColumn("comments", "parent")).toBe("parent_id");
    expect(relationColumn("reports", "handledBy")).toBe("handled_by_id");
    expect(relationColumn("homepage_configs", "updatedBy")).toBe("updated_by_id");
    expect(relationColumn("recommendation_events", "homepageConfig")).toBe("homepage_config_id");
    expect(relationColumn("audit_logs", "actor")).toBe("actor_id");
    expect(relationColumn("opc_demands", "author")).toBe("user_id");
    expect(relationColumn("opc_demands", "reviewedBy")).toBe("reviewed_by_id");
    expect(relationColumn("opc_demand_connect", "demand")).toBe("demand_id");
    expect(relationColumn("opc_demand_connect", "applyUser")).toBe("apply_user_id");
    expect(dataSource.getMetadata("opc_demands").relations.map((relation) => relation.propertyName)).toEqual(expect.arrayContaining(["author", "industries", "connections", "reviewedBy"]));
  });
});
