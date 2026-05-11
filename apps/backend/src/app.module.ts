import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { StudiesModule } from './modules/studies/studies.module';
import { AiModule } from './modules/ai-service/ai.module';

import { Study } from './modules/studies/study.entity';
import { AiResult } from './modules/ai-service/ai-result.entity';
import { Feedback } from './modules/feedback/feedback.entity';
import { Report } from './modules/reports/report.entity';
import { User } from './modules/users/user.entity';
import { Patient } from './modules/patients/patient.entity';
import { AuthModule } from './modules/auth/auth.module';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'radiology_user',
      password: '123456',
      database: 'radiology_db',
      entities: [Study, AiResult, Feedback, Report, User, Patient],
      synchronize: true,
      autoLoadEntities: true,
    }),
    StudiesModule,
    AiModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

