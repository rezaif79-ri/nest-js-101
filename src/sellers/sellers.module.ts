import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Seller } from './entities/seller.entity';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Seller]),
    // forwardRef: the controller pulls AuthService to refresh the JWT after
    // activation; AuthModule in turn depends on SellersService.
    forwardRef(() => AuthModule),
  ],
  controllers: [SellersController],
  providers: [SellersService],
  exports: [SellersService, TypeOrmModule],
})
export class SellersModule {}
