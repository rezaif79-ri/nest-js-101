import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SellerGuard } from '../auth/guards/seller.guard';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthTokenResponse } from '../auth/dto/login.dto';
import { ConfirmObjectDto } from '../common/dto/confirm-object.dto';
import { PresignUploadDto } from '../common/dto/presign-upload.dto';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { SellersService } from './sellers.service';

@ApiTags('sellers')
@ApiBearerAuth()
@Controller('sellers/v1')
@UseInterceptors(TransformInterceptor)
export class SellersController {
  constructor(
    private readonly sellersService: SellersService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * Activates the caller's seller profile and returns a brand-new JWT that
   * now carries their `sellerId`. The client swaps the stored token in place,
   * so seller routes work immediately without a re-login.
   */
  @Post('activate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async activate(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AuthTokenResponse> {
    await this.sellersService.activate(user.userId);
    return this.authService.issueToken(user.userId, user.email);
  }

  // --- Profile & storefront (requires an active seller profile) ---

  @Get('me')
  @UseGuards(JwtAuthGuard, SellerGuard)
  getProfile(@CurrentUser('userId') userId: string) {
    return this.sellersService.getProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, SellerGuard)
  updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSellerProfileDto,
  ) {
    return this.sellersService.updateProfile(userId, dto);
  }

  // Avatar
  @Post('me/avatar/presign')
  @UseGuards(JwtAuthGuard, SellerGuard)
  @HttpCode(HttpStatus.OK)
  presignAvatar(
    @CurrentUser('userId') userId: string,
    @Body() dto: PresignUploadDto,
  ) {
    return this.sellersService.presignAvatar(userId, dto);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard, SellerGuard)
  @HttpCode(HttpStatus.OK)
  confirmAvatar(
    @CurrentUser('userId') userId: string,
    @Body() dto: ConfirmObjectDto,
  ) {
    return this.sellersService.confirmAvatar(userId, dto.objectKey);
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard, SellerGuard)
  @HttpCode(HttpStatus.OK)
  removeAvatar(@CurrentUser('userId') userId: string) {
    return this.sellersService.removeAvatar(userId);
  }

  // Shop logo
  @Post('me/logo/presign')
  @UseGuards(JwtAuthGuard, SellerGuard)
  @HttpCode(HttpStatus.OK)
  presignLogo(
    @CurrentUser('userId') userId: string,
    @Body() dto: PresignUploadDto,
  ) {
    return this.sellersService.presignLogo(userId, dto);
  }

  @Post('me/logo')
  @UseGuards(JwtAuthGuard, SellerGuard)
  @HttpCode(HttpStatus.OK)
  confirmLogo(
    @CurrentUser('userId') userId: string,
    @Body() dto: ConfirmObjectDto,
  ) {
    return this.sellersService.confirmLogo(userId, dto.objectKey);
  }

  @Delete('me/logo')
  @UseGuards(JwtAuthGuard, SellerGuard)
  @HttpCode(HttpStatus.OK)
  removeLogo(@CurrentUser('userId') userId: string) {
    return this.sellersService.removeLogo(userId);
  }
}
