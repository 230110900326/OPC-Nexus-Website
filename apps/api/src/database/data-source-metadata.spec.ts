import dataSource from "./data-source";

describe("TypeORM metadata", () => {
  it("resolves every stage C and D entity relation", async () => {
    await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();
    const tables = dataSource.entityMetadatas.map((metadata) => metadata.tableName);
    for (const table of ["articles", "article_sources", "forum_sections", "posts", "comments", "likes", "favorites", "follows", "reports", "moderation_logs"]) expect(tables).toContain(table);
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
  });
});
