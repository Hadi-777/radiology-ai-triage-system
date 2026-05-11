import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { StudiesModule } from './modules/studies/studies.module';
import { AiModule } from './modules/ai-service/ai.module';
import { AuthModule } from './modules/auth/auth.module';

import { Study } from './modules/studies/study.entity';
import { AiResult } from './modules/ai-service/ai-result.entity';
import { Feedback } from './modules/feedback/feedback.entity';
import { Report } from './modules/reports/report.entity';
import { User } from './modules/users/user.entity';
import { Patient } from './modules/patients/patient.entity';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [Study, AiResult, Feedback, Report, User, Patient],
            synchronize: true,
            autoLoadEntities: true,
            ssl: isProduction
              ? {
                  rejectUnauthorized: false,
                }
              : false,
          }
        : {
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'radiology_user',
            password: '123456',
            database: 'radiology_db',
            entities: [Study, AiResult, Feedback, Report, User, Patient],
            synchronize: true,
            autoLoadEntities: true,
          },
    ),
    StudiesModule,
    AiModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
