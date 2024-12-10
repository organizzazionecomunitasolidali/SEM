import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity()
export class SemDebugLog {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  message: string;

  @Column()
  @Index()
  createdAt: Date;
  
}