import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Unique,
    CreateDateColumn,
    DeleteDateColumn,
    Index,
    ManyToOne,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity()
  @Unique(['url'])
  @Unique(['url_hash'])
  export class SemProductThumbnail {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    url: string;

    @Column()
    url_hash: string;
    
  }
  