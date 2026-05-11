import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Study } from './study.entity';
import { StudiesService } from './studies.service';
import { StudiesController } from './studies.controller';
import { AiModule } from '../ai-service/ai.module';
import { AiResult } from '../ai-service/ai-result.entity';
import { Feedback } from '../feedback/feedback.entity';
import { Patient } from '../patients/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Study, AiResult, Feedback, Patient]), AiModule],
  controllers: [StudiesController],
  providers: [StudiesService],
})
export class StudiesModule {}

