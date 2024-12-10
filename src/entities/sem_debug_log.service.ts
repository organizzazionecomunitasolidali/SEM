import { Injectable } from '@nestjs/common';
import { SemDebugLog } from './sem_debug_log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SemDebugLogService {

    constructor(
        @InjectRepository(SemDebugLog)
        private readonly semDebugLogRepository: Repository<SemDebugLog>,
    ) {}

    async create(message: string): Promise<SemDebugLog> {
        const log = new SemDebugLog();
        log.message = message;
        log.createdAt = new Date();
        await this.deleteOldLogs();
        return this.semDebugLogRepository.save(log);
    }
    
    async deleteOldLogs(): Promise<void> {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        await this.semDebugLogRepository
            .createQueryBuilder()
            .delete()
            .from(SemDebugLog)
            .where('createdAt < :date', { date: oneWeekAgo })
            .execute();
    }
  
}
