import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity()
export class SemDinastycoinConfig {
    
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  apiKey: string;

  @Column({ nullable: true })
  signature: string;

  @Column({ nullable: true })
  pin: number;

}
