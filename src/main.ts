import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Build the OpenAPI document. The @nestjs/swagger CLI plugin (configured in
  // nest-cli.json) introspects every controller and DTO at build time, so the
  // schema is generated automatically without per-field decorators.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ecommerce API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
