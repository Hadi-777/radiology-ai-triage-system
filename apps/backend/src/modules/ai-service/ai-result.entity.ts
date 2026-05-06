import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Study } from '../studies/study.entity';

@Entity('ai_results')
export class AiResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  label!: string;

  @Column('float')
  confidence!: number;

  @Column()
  priority!: string;

  @Column({ default: 'No message available.'})
  message!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Study, (study) => study.aiResults)
  @JoinColumn({ name: 'study_id' })
  study!: Study;
}

