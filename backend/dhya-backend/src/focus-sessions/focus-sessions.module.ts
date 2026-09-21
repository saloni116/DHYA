import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FocusSessionsController } from './focus-sessions.controller';
import { FocusSessionsService } from './focus-sessions.service';

@Module({
  imports: [PrismaModule],
  controllers: [FocusSessionsController],
  providers: [FocusSessionsService],
  exports: [FocusSessionsService],
})
export class FocusSessionsModule {}
