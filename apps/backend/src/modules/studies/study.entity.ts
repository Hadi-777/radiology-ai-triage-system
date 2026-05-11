import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { Patient } from '../patients/patient.entity';
import { User } from '../users/user.entity';
import { AiResult } from '../ai-service/ai-result.entity';
import { Feedback } from '../feedback/feedback.entity';

@Entity()
export class Study {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  patientId!: string;

  @Column()
  imagePath!: string;

  @Column()
  originalName!: string;

  @Column()
  status!: string;

  @CreateDateColumn()
  uploadedAt!: Date;

  @ManyToOne(() => Patient)
  patient!: Patient;

  @ManyToOne(() => User)
  uploadedBy!: User;

  @OneToMany(() => AiResult, (aiResult) => aiResult.study)
  aiResults!: AiResult[];

  @OneToMany(() => Feedback, (feedback) => feedback.study)
  feedbacks!: Feedback[];
}

