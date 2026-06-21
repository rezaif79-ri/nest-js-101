import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfirmObjectDto } from '../common/dto/confirm-object.dto';
import { PresignUploadDto } from '../common/dto/presign-upload.dto';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { CustomersService } from './customers.service';
import { MeDto } from './dto/me-response.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

/**
 * The signed-in customer's own profile. Every user has a customer profile from
 * registration, so JwtAuthGuard alone is sufficient.
 */
@ApiTags('customer-profile')
@ApiBearerAuth()
@Controller('customers/v1/me')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformInterceptor)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOkResponse({ type: MeDto })
  getProfile(
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
  ) {
    return this.customersService.getProfile(userId, email);
  }

  @Patch()
  updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customersService.updateProfile(userId, dto);
  }

  @Post('avatar/presign')
  @HttpCode(HttpStatus.OK)
  presignAvatar(
    @CurrentUser('userId') userId: string,
    @Body() dto: PresignUploadDto,
  ) {
    return this.customersService.presignAvatar(userId, dto);
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  confirmAvatar(
    @CurrentUser('userId') userId: string,
    @Body() dto: ConfirmObjectDto,
  ) {
    return this.customersService.confirmAvatar(userId, dto.objectKey);
  }

  @Delete('avatar')
  @HttpCode(HttpStatus.OK)
  removeAvatar(@CurrentUser('userId') userId: string) {
    return this.customersService.removeAvatar(userId);
  }
}
