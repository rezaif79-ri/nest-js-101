import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seller } from './entities/seller.entity';

@Injectable()
export class SellersService {
  constructor(
    @InjectRepository(Seller)
    private readonly sellerRepository: Repository<Seller>,
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
}
