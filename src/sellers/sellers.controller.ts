import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AuthTokenResponse } from '../auth/dto/login.dto';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { SellersService } from './sellers.service';

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
}
