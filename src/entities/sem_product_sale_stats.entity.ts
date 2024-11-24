import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity()
@Unique(['productId', 'weekTimestampStart'])
export class SemProductSaleStats {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @Column()
  weekTimestampStart: number;

  @Column()
  sales: number;

}
