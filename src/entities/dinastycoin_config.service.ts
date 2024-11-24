import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DinastycoinConfig } from './dinastycoin_config.entity';

@Injectable()
export class DinastycoinConfigService {
  constructor(
    @InjectRepository(DinastycoinConfig)
    private dinastycoinConfigRepository: Repository<DinastycoinConfig>,
  ) {}

  async findAll(): Promise<DinastycoinConfig[]> {
    return await this.dinastycoinConfigRepository.find();
  }

  async findOneWithMaxId(): Promise<DinastycoinConfig> {
    return await this.dinastycoinConfigRepository.findOne({ order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<DinastycoinConfig> {
    return await this.dinastycoinConfigRepository.findOne({ where: { id } });
  }

  async create(dinastycoinConfig: Partial<DinastycoinConfig>): Promise<DinastycoinConfig> {
    const newConfig = this.dinastycoinConfigRepository.create(dinastycoinConfig);
    return await this.dinastycoinConfigRepository.save(newConfig);
  }

  async update(id: number, dinastycoinConfig: Partial<DinastycoinConfig>): Promise<DinastycoinConfig> {
    await this.dinastycoinConfigRepository.update(id, dinastycoinConfig);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.dinastycoinConfigRepository.delete(id);
  }
}
