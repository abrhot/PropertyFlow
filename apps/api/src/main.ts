import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });
  // Request bodies are validated per-route with Zod (see ZodValidationPipe).
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`PropertyFlow API listening on http://localhost:${port}/api`);
}

void bootstrap();
