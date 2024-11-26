import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity()
@Unique(['name'])
export class DinastycoinConfig {
    
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  apiKey: string;

  @Column({ nullable: true })
  signature: string;

  @Column({ nullable: true })
  pin: number;

}
