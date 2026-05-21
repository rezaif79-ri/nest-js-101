import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply a global validation pipe so DTO validation runs automatically.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
  })

  // Apply a global interceptor so every successful controller
  // response is wrapped as { status: 'success', data: ... }
  // app.useGlobalInterceptors(new TransformInterceptor());

  // Apply a global filter so all thrown exceptions are normalized
  // into a standard fail/error output shape.
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
