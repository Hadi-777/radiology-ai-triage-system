import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Study } from '../studies/study.entity';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  study_id!: string;

  @Column()
  decision!: string;

  @Column({ default: '' })
  comment!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Study, (study) => study.feedbacks, { nullable: true })
  @JoinColumn({ name: 'study_id' })
  study!: Study;
}

