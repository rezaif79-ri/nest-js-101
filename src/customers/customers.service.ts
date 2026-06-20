import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EXTENSION_BY_TYPE } from '../common/upload';
import { PresignUploadDto } from '../common/dto/presign-upload.dto';
import { StorageService } from '../storage/storage.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { Customer } from './entities/customer.entity';

/** Customer profile with the avatar resolved to a public URL for responses. */
export interface CustomerProfileView extends Customer {
  avatarUrl: string | null;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly storage: StorageService,
  ) {}

  findByUserId(userId: string): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: { userId } });
  }

  /**
   * Provisions a customer profile for a user. Accepts an `EntityManager` so
   * it can take part in the registration transaction (sharing the same
   * connection/rollback scope as the User insert).
   */
  createForUser(manager: EntityManager, userId: string): Promise<Customer> {
    const customer = manager.create(Customer, { userId });
    return manager.save(customer);
  }

  async getProfile(userId: string): Promise<CustomerProfileView> {
    return this.toView(await this.getOwn(userId));
  }

  async updateProfile(
    userId: string,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileView> {
    const customer = await this.getOwn(userId);
    Object.assign(customer, dto);
    return this.toView(await this.customerRepository.save(customer));
  }

  /** Presigned upload for the customer's avatar, scoped under their prefix. */
  async presignAvatar(
    userId: string,
    dto: PresignUploadDto,
  ): Promise<{ objectKey: string; uploadUrl: string; expiresIn: number }> {
    const customer = await this.getOwn(userId);
    const ext = EXTENSION_BY_TYPE[dto.contentType];
    const objectKey = `avatars/customer/${customer.id}/${randomUUID()}.${ext}`;
    const expiresIn = 300;
    const uploadUrl = await this.storage.presignUpload(
      objectKey,
      dto.contentType,
      expiresIn,
    );
    return { objectKey, uploadUrl, expiresIn };
  }

  /** Records the uploaded avatar; replaces (and deletes) any previous one. */
  async confirmAvatar(
    userId: string,
    objectKey: string,
  ): Promise<CustomerProfileView> {
    const customer = await this.getOwn(userId);
    if (!objectKey.startsWith(`avatars/customer/${customer.id}/`)) {
      throw new BadRequestException(
        'objectKey does not belong to this customer.',
      );
    }
    const previous = customer.avatarObjectKey;
    customer.avatarObjectKey = objectKey;
    const saved = await this.customerRepository.save(customer);
    if (previous && previous !== objectKey) {
      await this.storage.deleteObject(previous);
    }
    return this.toView(saved);
  }

  async removeAvatar(userId: string): Promise<CustomerProfileView> {
    const customer = await this.getOwn(userId);
    const previous = customer.avatarObjectKey;
    customer.avatarObjectKey = null;
    const saved = await this.customerRepository.save(customer);
    if (previous) {
      await this.storage.deleteObject(previous);
    }
    return this.toView(saved);
  }

  private async getOwn(userId: string): Promise<Customer> {
    const customer = await this.findByUserId(userId);
    if (!customer) {
      throw new NotFoundException('Customer profile not found.');
    }
    return customer;
  }

  private toView(customer: Customer): CustomerProfileView {
    return {
      ...customer,
      avatarUrl: customer.avatarObjectKey
        ? this.storage.publicUrl(customer.avatarObjectKey)
        : null,
    };
  }
}
