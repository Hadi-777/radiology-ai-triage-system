import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  fullName!: string;

  @Column()
  age!: number;

  @Column()
  gender!: string;

  @Column()
  phoneNumber!: string;

  @Column()
  medicalRecordNumber!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

