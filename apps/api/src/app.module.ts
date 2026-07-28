import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AbilitiesGuard } from './common/guards/abilities.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validateEnv } from './config/env.validation';
import { InvitationsModule } from './invitations/invitations.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    InvitationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global auth: every route requires a valid access token unless @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Legacy coarse RBAC for existing @Roles(...) routes.
    { provide: APP_GUARD, useClass: RolesGuard },
    // Action/subject authorization for @CheckAbility(...) routes.
    { provide: APP_GUARD, useClass: AbilitiesGuard },
  ],
})
export class AppModule {}
