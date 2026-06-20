import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminUsersController } from './admin-users.controller';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // forwardRef breaks the Users <-> Auth cycle: AuthModule imports
    // UsersModule for UsersService, while the admin controller needs the
    // JwtAuthGuard/AdminGuard exported by AuthModule.
    forwardRef(() => AuthModule),
  ],
  controllers: [AdminUsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
