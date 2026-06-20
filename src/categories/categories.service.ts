import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogCacheService } from '../cache/catalog-cache.service';
import { generateUniqueSlug, slugify } from '../common/slugify';
import { Category } from '../products/entities/category.entity';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly cache: CatalogCacheService,
  ) {}

  /** All categories, alphabetical. A bounded reference set, so not paginated. */
  findAll(): Promise<Category[]> {
    return this.categoryRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found.`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    if (dto.parentId) {
      await this.requireExisting(dto.parentId);
    }
    const slug = await this.generateUniqueSlug(dto.name);
    const category = this.categoryRepository.create({
      name: dto.name,
      slug,
      parentId: dto.parentId ?? null,
    });
    return this.categoryRepository.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (dto.parentId !== undefined) {
      await this.assertValidParent(id, dto.parentId);
      category.parentId = dto.parentId;
    }
    if (dto.name !== undefined) {
      // Slug stays stable across renames to keep URLs/cache keys durable.
      category.name = dto.name;
    }

    const saved = await this.categoryRepository.save(category);
    // Reparenting can change which products surface under a category filter.
    if (dto.parentId !== undefined) {
      await this.cache.invalidateList();
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Category ${id} not found.`);
    }
    // Products are SET NULL out of the category by the FK, so category-filtered
    // catalog pages are now stale.
    await this.cache.invalidateList();
  }

  /** Throws 404 unless the category exists. Used to validate FK references. */
  async requireExisting(id: string): Promise<Category> {
    return this.findOne(id);
  }

  /**
   * Validates a proposed parent: it must exist, not be the category itself, and
   * not be one of its descendants (which would create a cycle).
   */
  private async assertValidParent(
    id: string,
    parentId: string | null,
  ): Promise<void> {
    if (parentId === null) {
      return;
    }
    if (parentId === id) {
      throw new BadRequestException('A category cannot be its own parent.');
    }
    await this.requireExisting(parentId);

    // Walk up from the proposed parent; hitting `id` means `id` is an ancestor
    // of the new parent, so reparenting would form a cycle.
    let cursor: string | null = parentId;
    while (cursor) {
      const node: Category | null = await this.categoryRepository.findOne({
        where: { id: cursor },
        select: { id: true, parentId: true },
      });
      if (!node) {
        break;
      }
      if (node.parentId === id) {
        throw new BadRequestException(
          'Cannot reparent a category under one of its own descendants.',
        );
      }
      cursor = node.parentId;
    }
  }

  private generateUniqueSlug(name: string): Promise<string> {
    return generateUniqueSlug(slugify(name, 'category'), (candidate) =>
      this.categoryRepository.exists({ where: { slug: candidate } }),
    );
  }
}
