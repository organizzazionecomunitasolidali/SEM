import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SemDinastycoinConfig } from './sem_dinastycoin_config.entity';

@Injectable()
export class SemDinastycoinConfigService {
  constructor(
    @InjectRepository(SemDinastycoinConfig)
    private dinastycoinConfigRepository: Repository<SemDinastycoinConfig>,
  ) {}

  async findAll(): Promise<SemDinastycoinConfig[]> {
    return await this.dinastycoinConfigRepository.find();
  }

  async findOneWithMaxId(): Promise<SemDinastycoinConfig> {
    return await this.dinastycoinConfigRepository.findOne({ where: {}, order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<SemDinastycoinConfig> {
    return await this.dinastycoinConfigRepository.findOne({ where: { id } });
  }

  async create(dinastycoinConfig: Partial<SemDinastycoinConfig>): Promise<SemDinastycoinConfig> {
    const newConfig = this.dinastycoinConfigRepository.create(dinastycoinConfig);
    return await this.dinastycoinConfigRepository.save(newConfig);
  }

  async update(id: number, dinastycoinConfig: Partial<SemDinastycoinConfig>): Promise<SemDinastycoinConfig> {
    await this.dinastycoinConfigRepository.update(id, dinastycoinConfig);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.dinastycoinConfigRepository.delete(id);
  }
}
