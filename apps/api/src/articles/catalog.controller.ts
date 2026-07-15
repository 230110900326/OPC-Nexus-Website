import { Controller, Get } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Category } from "../database/entities/category.entity";
import { Tag } from "../database/entities/tag.entity";

@Controller()
export class CatalogController {
  constructor(@InjectRepository(Category) private readonly categoryRepository: Repository<Category>, @InjectRepository(Tag) private readonly tagRepository: Repository<Tag>) {}
  @Get("categories") async categories() { return { success: true, data: await this.categoryRepository.find({ where: { isActive: true }, relations: { children: true }, order: { sortOrder: "ASC", name: "ASC" } }) }; }
  @Get("tags") async tags() { return { success: true, data: await this.tagRepository.find({ order: { name: "ASC" } }) }; }
}
