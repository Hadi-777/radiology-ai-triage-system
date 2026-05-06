import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AiResult } from '../ai-service/ai-result.entity';

@Entity('studies')
export class Study {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patient_id: string;

  @Column()
  image_path: string;

  @Column()
  original_name: string;

  @Column()
  status: string;

  @CreateDateColumn()
  uploaded_at: Date;

  @OneToMany(() => AiResult, (aiResult) => aiResult.study)
  aiResults: AiResult[];
}
