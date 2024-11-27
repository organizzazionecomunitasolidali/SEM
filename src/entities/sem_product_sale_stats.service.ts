import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SemProductSaleStats } from './sem_product_sale_stats.entity';
import * as moment from 'moment';
import { LessThan } from 'typeorm';
import { Connection } from 'typeorm';
import { getStartOfWeekTimestamp } from '../utils/DateUtils';

@Injectable()
export class SemProductSaleStatsService {
  constructor(
    @InjectRepository(SemProductSaleStats)
    private semProductSaleStatsRepository: Repository<SemProductSaleStats>,
    @Inject('PERSISTENT_DATABASE_CONNECTION')
    private readonly persistentDbConnection: Connection,
  ) {}

  findAll(): Promise<SemProductSaleStats[]> {
    return this.semProductSaleStatsRepository.find();
  }

  findOne(id: number): Promise<SemProductSaleStats> {
    return this.semProductSaleStatsRepository.findOne({
      where: { id },
    });
  }

  async create(stats: Partial<SemProductSaleStats>): Promise<SemProductSaleStats> {
    const newStats = this.semProductSaleStatsRepository.create(stats);
    return await this.semProductSaleStatsRepository.save(newStats);
  }

  async update(id: number, stats: Partial<SemProductSaleStats>): Promise<SemProductSaleStats> {
    await this.semProductSaleStatsRepository.update(id, stats);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.semProductSaleStatsRepository.delete(id);
  }

  async findByProductId(productId: number): Promise<SemProductSaleStats[]> {
    return this.semProductSaleStatsRepository.find({
      where: { productId },
      order: { weekTimestampStart: 'DESC' },
    });
  }

  async findByWeekTimestamp(weekTimestampStart: number): Promise<SemProductSaleStats[]> {
    return this.semProductSaleStatsRepository.find({
      where: { weekTimestampStart },
    });
  }


  async sumAllSalesByProductIdInThePastWeeks(productId: number): Promise<number> {
    let startOfWeek = getStartOfWeekTimestamp();
    let statsInPastWeeks = await this.semProductSaleStatsRepository.find({
        where: { 
          productId: productId,
          weekTimestampStart: LessThan(startOfWeek.unix())
        },
    });
    let sum = 0;
    for(let i = 0;i < statsInPastWeeks.length;i++){
      sum += statsInPastWeeks[i].sales;
    }
    return sum;
  }

  // update the sales stats record for this product and this week
  async updateTotalSales(productId: number, currentTotalSales: number) {
    let sumPastSales = await this.sumAllSalesByProductIdInThePastWeeks(productId);
    let salesInThisWeek = currentTotalSales - sumPastSales;
    let weekStartTimestamp = getStartOfWeekTimestamp().unix();
    // use persistentDbConnection for making a raw query that is compatible to SQLite and Mysql, to insert or update the sales stats record for this product and this week
    const query = `
      REPLACE INTO sem_product_sale_stats (productId, weekTimestampStart, sales)
      VALUES (${productId}, ${weekStartTimestamp}, ${salesInThisWeek})
    `;
    await this.persistentDbConnection.query(query);
  }

}
