import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity()
@Unique(['name'])
export class DinastycoinConfig {
    
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  endpoint: string;

  @Column()
  apiKey: string;

  @Column()
  login: string;

  @Column()
  password: string;

  @Column()
  pin: number;

}
