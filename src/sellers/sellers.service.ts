import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PresignUploadDto } from '../common/dto/presign-upload.dto';
import { EXTENSION_BY_TYPE } from '../common/upload';
import { StorageService } from '../storage/storage.service';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { Seller } from './entities/seller.entity';

/** Postgres unique-violation error code. */
const PG_UNIQUE_VIOLATION = '23505';

/** Which storefront image a presign/confirm call targets. */
type SellerImageKind = 'avatar' | 'logo';

/** Seller profile with avatar + shop logo resolved to public URLs. */
export interface SellerProfileView extends Seller {
  avatarUrl: string | null;
  shopLogoUrl: string | null;
}

@Injectable()
export class SellersService {
  constructor(
    @InjectRepository(Seller)
    private readonly sellerRepository: Repository<Seller>,
    private readonly storage: StorageService,
  ) {}

  findByUserId(userId: string): Promise<Seller | null> {
    return this.sellerRepository.findOne({ where: { userId } });
  }

  /**
   * Activates a seller profile for an existing user. Idempotency is enforced
   * by the unique `userId` constraint; we surface a friendly 409 instead of a
   * raw DB error when a profile already exists.
   */
  async activate(userId: string): Promise<Seller> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      throw new ConflictException('Seller profile is already active.');
    }

    const seller = this.sellerRepository.create({ userId });
    return this.sellerRepository.save(seller);
  }

  async getProfile(userId: string): Promise<SellerProfileView> {
    return this.toView(await this.getOwn(userId));
  }

  async updateProfile(
    userId: string,
    dto: UpdateSellerProfileDto,
  ): Promise<SellerProfileView> {
    const seller = await this.getOwn(userId);
    Object.assign(seller, dto);
    try {
      return this.toView(await this.sellerRepository.save(seller));
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Shop name or slug is already taken.');
      }
      throw err;
    }
  }

  /** Presigned upload for the seller's avatar. */
  presignAvatar(userId: string, dto: PresignUploadDto) {
    return this.presignImage(userId, 'avatar', dto);
  }

  /** Presigned upload for the seller's shop logo. */
  presignLogo(userId: string, dto: PresignUploadDto) {
    return this.presignImage(userId, 'logo', dto);
  }

  confirmAvatar(userId: string, objectKey: string) {
    return this.confirmImage(userId, 'avatar', objectKey);
  }

  confirmLogo(userId: string, objectKey: string) {
    return this.confirmImage(userId, 'logo', objectKey);
  }

  removeAvatar(userId: string) {
    return this.clearImage(userId, 'avatar');
  }

  removeLogo(userId: string) {
    return this.clearImage(userId, 'logo');
  }

  private async presignImage(
    userId: string,
    kind: SellerImageKind,
    dto: PresignUploadDto,
  ): Promise<{ objectKey: string; uploadUrl: string; expiresIn: number }> {
    const seller = await this.getOwn(userId);
    const ext = EXTENSION_BY_TYPE[dto.contentType];
    const objectKey = `${this.prefix(kind, seller.id)}${randomUUID()}.${ext}`;
    const expiresIn = 300;
    const uploadUrl = await this.storage.presignUpload(
      objectKey,
      dto.contentType,
      expiresIn,
    );
    return { objectKey, uploadUrl, expiresIn };
  }

  private async confirmImage(
    userId: string,
    kind: SellerImageKind,
    objectKey: string,
  ): Promise<SellerProfileView> {
    const seller = await this.getOwn(userId);
    if (!objectKey.startsWith(this.prefix(kind, seller.id))) {
      throw new BadRequestException(
        'objectKey does not belong to this seller.',
      );
    }
    const field =
      kind === 'avatar' ? 'avatarObjectKey' : 'shopLogoObjectKey';
    const previous = seller[field];
    seller[field] = objectKey;
    const saved = await this.sellerRepository.save(seller);
    if (previous && previous !== objectKey) {
      await this.storage.deleteObject(previous);
    }
    return this.toView(saved);
  }

  private async clearImage(
    userId: string,
    kind: SellerImageKind,
  ): Promise<SellerProfileView> {
    const seller = await this.getOwn(userId);
    const field =
      kind === 'avatar' ? 'avatarObjectKey' : 'shopLogoObjectKey';
    const previous = seller[field];
    seller[field] = null;
    const saved = await this.sellerRepository.save(seller);
    if (previous) {
      await this.storage.deleteObject(previous);
    }
    return this.toView(saved);
  }

  private prefix(kind: SellerImageKind, sellerId: string): string {
    return kind === 'avatar'
      ? `avatars/seller/${sellerId}/`
      : `shops/${sellerId}/logo/`;
  }

  private async getOwn(userId: string): Promise<Seller> {
    const seller = await this.findByUserId(userId);
    if (!seller) {
      throw new NotFoundException('Seller profile not found.');
    }
    return seller;
  }

  private toView(seller: Seller): SellerProfileView {
    return {
      ...seller,
      avatarUrl: seller.avatarObjectKey
        ? this.storage.publicUrl(seller.avatarObjectKey)
        : null,
      shopLogoUrl: seller.shopLogoObjectKey
        ? this.storage.publicUrl(seller.shopLogoObjectKey)
        : null,
    };
  }
}
