import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { SuccessResponse } from '../dto/response.dto';

/**
 * Global interceptor that maps all successful controller results
 * into a standardized response envelope.
 *
 * Example output:
 * {
 *   status: 'success',
 *   data: { ... }
 * }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    

    return next.handle().pipe(
      map((data) => ({
        status: 'success',
        data,
      })),
    );
  }
}
