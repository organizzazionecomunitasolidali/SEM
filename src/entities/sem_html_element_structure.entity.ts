import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  // OneToOne,
  // JoinColumn,
  ManyToOne,
} from 'typeorm';
import { SemOpenaiCompletions } from './sem_openai_completions.entity';
import { SemWebsite } from '../entities/sem_website.entity';

@Entity()
export class SemHtmlElementStructure {
  @PrimaryGeneratedColumn()
  id: number;

  // @Column()
  // group_id: number; // This could become wrong if html_entity get crawled again and group_id change

  @Column({ nullable: true })
  selector: string;

  // Pagination, product, category, ecc..
  @Column()
  type: number;

  @Column()
  json: string;

  @ManyToOne(
    () => SemOpenaiCompletions,
    (openaiCompletions) => openaiCompletions.htmlElementStructures,
  )
  openaiCompletions: SemOpenaiCompletions;

  @ManyToOne(() => SemWebsite, (website) => website.htmlElementStructures)
  website: SemWebsite;
}
