import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  study_id: number;

  @Column('text')
  draft_text: string;

  @Column('text')
  final_text: string;

  @Column()
  approved: boolean;

  @Column()
  rejected: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

