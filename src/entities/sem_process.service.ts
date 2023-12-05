import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SemProcess } from '../entities/sem_process.entity';

export class SemProcessStatus {
  static readonly RUNNING = 1; // 2^0, binary 0001
  static readonly PAUSED = 2; // 2^1, binary 0010
  static readonly ERROR = 4; // 2^2, binary 0100
  // static readonly STATUS_BIT_4 = 8; // 2^3, binary 1000
  // Add more as needed
}

export class SemProcessDto {
  saveObjects: SemProcess[]; // Obejects to create or update with save
  deleteIds: number[]; // Obejcts to delete from ids
}

@Injectable()
export class SemProcessService {
  constructor(
    @InjectRepository(SemProcess)
    private readonly semProcessRepository: Repository<SemProcess>,
  ) {}

  findAll(): Promise<SemProcess[]> {
    return this.semProcessRepository.find({ relations: ['websites'] });
  }

  async findOne(id: number): Promise<SemProcess> {
    return this.semProcessRepository.findOne({
      where: { id },
      relations: ['websites'],
    });
  }

  async updateProcessField(
    process: SemProcess,
    fieldName: string,
    newValue: any,
  ): Promise<SemProcess> {
    process[fieldName] = newValue; // Update the field
    await this.semProcessRepository.save(process); // Save the updated process

    return process;
  }

  async sync(processDto: SemProcessDto) {
    if (processDto.saveObjects.length > 0) {
      const saveObjectsPromises = processDto.saveObjects.map((object) => {
        return this.semProcessRepository.save(object);
      });

      await Promise.all(saveObjectsPromises);
    }

    if (processDto.deleteIds.length > 0) {
      const deleteIdsPromises = processDto.deleteIds.map((deleteId) => {
        return this.semProcessRepository.delete(deleteId);
      });

      await Promise.all(deleteIdsPromises);
    }
  }
}
