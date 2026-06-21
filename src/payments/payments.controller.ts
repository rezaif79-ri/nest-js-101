import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { PaymentService } from './payment.service';

/**
 * Public payment-gateway callback surface. No auth guard: authenticity is
 * established by the provider's own signature (Midtrans `signature_key`, or the
 * mock shared-secret header), verified inside the service.
 */
@ApiTags('payments')
@Controller('payments/v1')
@UseInterceptors(TransformInterceptor)
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    return this.paymentService.handleWebhook(body, headers);
  }
}
