import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  study_id!: string;

  @Column()
  decision!: string;

  @Column({ default: '' })
  comment!: string;

  @CreateDateColumn()
  created_at!: Date;
}

