import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Study } from './modules/studies/study.entity';
import { AiResult } from './modules/ai-service/ai-result.entity';
import { Report } from './modules/reports/report.entity';
import { Feedback } from './modules/feedback/feedback.entity';
import { StudiesModule } from './modules/studies/studies.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'radiology_user',
      password: '123456',
      database: 'radiology_db',
      autoLoadEntities: false,
      synchronize: true,
      entities: [Study, AiResult, Report, Feedback],
    }),
    StudiesModule,
  ],
})
export class AppModule {}

