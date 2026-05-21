import { Injectable } from '@nestjs/common';
import { User } from './interface/users.interface';

@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  create(user: User) {
    this.users.push({
      name: user.name,
      age: user.age,
      address: user.address || undefined,
    });
  }

  findAll(): User[] {
    return this.users;
  }
}