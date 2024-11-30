import { Entity, PrimaryGeneratedColumn, Column, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { SemProduct } from './sem_product.entity';

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

  @ManyToOne(() => SemProduct, (product) => product.stats)
  product: SemProduct;

}
