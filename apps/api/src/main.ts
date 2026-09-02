import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '12mb' });
  const config = app.get(ConfigService<Env, true>);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  const allowedOrigins = [
    config.get('WEB_ORIGIN', { infer: true }),
    config.get('MOBILE_WEB_ORIGIN', { infer: true }),
  ];
  app.enableCors({
    // Allow configured web origins; also accept requests with no Origin
    // (React Native / native apps) and Expo LAN web previews in development.
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin) || config.get('NODE_ENV', { infer: true }) === 'development') {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });
  // Request bodies are validated per-route with Zod (see ZodValidationPipe).
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  // Bind on all interfaces so phones on the LAN can reach the API
  // (default Nest listen can be IPv6-only on some Windows setups).
  await app.listen(port, '0.0.0.0');
  console.log(`PropertyFlow API listening on http://0.0.0.0:${port}/api`);
}

void bootstrap();
