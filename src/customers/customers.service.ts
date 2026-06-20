import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
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
}
