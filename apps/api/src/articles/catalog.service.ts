import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Article } from "../database/entities/article.entity";
import { Category } from "../database/entities/category.entity";
import { Tag } from "../database/entities/tag.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateTagDto } from "./dto/create-tag.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdateTagDto } from "./dto/update-tag.dto";

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
    @InjectRepository(Article) private readonly articles: Repository<Article>,
  ) {}

  async listCategories(activeOnly = true) {
    const values = await this.categories.find({
      where: activeOnly ? { isActive: true, parent: IsNull() } : { parent: IsNull() },
      relations: { children: true },
      order: { sortOrder: "ASC", name: "ASC", children: { sortOrder: "ASC", name: "ASC" } },
    });
    if (activeOnly) for (const category of values) category.children = category.children.filter((child) => child.isActive);
    return values;
  }
  listTags() { return this.tags.find({ order: { name: "ASC" } }); }

  async createCategory(input: CreateCategoryDto) {
    await this.ensureCategorySlug(input.slug);
    const parent = input.parentId ? await this.category(input.parentId) : null;
    if (parent?.parent) throw new BadRequestException("分类仅支持父子两级结构");
    const category = this.categories.create({ name: input.name.trim(), slug: input.slug, sortOrder: input.sortOrder ?? 0, isActive: input.isActive ?? true, parent });
    return this.categories.save(category);
  }
  async updateCategory(id: string, input: UpdateCategoryDto) {
    const category = await this.category(id);
    if (input.slug && input.slug !== category.slug) await this.ensureCategorySlug(input.slug);
    if (input.parentId === id) throw new BadRequestException("分类不能以自身作为父级");
    if (input.parentId) {
      const parent = await this.category(input.parentId);
      if (parent.parent) throw new BadRequestException("分类仅支持父子两级结构");
      if (await this.categories.exists({ where: { parent: { id } } })) throw new BadRequestException("已有子分类的分类不能再设为子级");
      category.parent = parent;
    } else if (input.parentId === null) category.parent = null;
    if (input.name !== undefined) category.name = input.name.trim();
    if (input.slug !== undefined) category.slug = input.slug;
    if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) category.isActive = input.isActive;
    return this.categories.save(category);
  }
  async deleteCategory(id: string) {
    const category = await this.category(id);
    if (await this.categories.exists({ where: { parent: { id } } })) throw new ConflictException("请先处理该分类的子分类");
    if (await this.articles.exists({ where: { category: { id } } })) throw new ConflictException("该分类仍有关联文章，可先停用分类");
    await this.categories.remove(category);
    return { id };
  }

  async createTag(input: CreateTagDto) { await this.ensureTagUnique(input.slug, input.name); return this.tags.save(this.tags.create({ name: input.name.trim(), slug: input.slug })); }
  async updateTag(id: string, input: UpdateTagDto) { const tag = await this.tag(id); if ((input.slug && input.slug !== tag.slug) || (input.name && input.name.trim() !== tag.name)) await this.ensureTagUnique(input.slug ?? tag.slug, input.name?.trim() ?? tag.name, id); if (input.name !== undefined) tag.name = input.name.trim(); if (input.slug !== undefined) tag.slug = input.slug; return this.tags.save(tag); }
  async deleteTag(id: string) { const tag = await this.tag(id); await this.tags.remove(tag); return { id }; }

  private async category(id: string) { const value = await this.categories.findOne({ where: { id }, relations: { parent: true } }); if (!value) throw new NotFoundException("分类不存在"); return value; }
  private async tag(id: string) { const value = await this.tags.findOneBy({ id }); if (!value) throw new NotFoundException("标签不存在"); return value; }
  private async ensureCategorySlug(slug: string) { if (await this.categories.exists({ where: { slug } })) throw new ConflictException("分类 slug 已存在"); }
  private async ensureTagUnique(slug: string, name: string, excludeId?: string) { const value = await this.tags.createQueryBuilder("tag").where("(tag.slug = :slug OR tag.name = :name)", { slug, name }).andWhere(excludeId ? "tag.id != :excludeId" : "1 = 1", { excludeId }).getExists(); if (value) throw new ConflictException("标签名称或 slug 已存在"); }
}
