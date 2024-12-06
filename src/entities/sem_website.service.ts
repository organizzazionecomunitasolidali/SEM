import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SemWebsite } from '../entities/sem_website.entity';
import { SemProduct } from '../entities/sem_product.entity';
import { SemProcessService } from './sem_process.service';
import { SemProductSaleStatsService } from '../entities/sem_product_sale_stats.service';
import { Logger } from '@nestjs/common';
import * as moment from 'moment';
import 'moment-timezone';
import { getStartOfWeekTimestamp } from '../utils/DateUtils';
import {
  SemHtmlElementStructureService,
  // SemHtmlElementStructureDto,
} from './sem_html_element_structure.service';
import { SemOpenaiCompletionsService } from './sem_openai_completions.service';
const {
  // HTML_ELEMENT_TYPE_UNKNOWN,
  HTML_ELEMENT_TYPE_PRODUCT,
  // HTML_ELEMENT_TYPE_CATEGORY,
  HTML_ELEMENT_TYPE_PAGINATION,
} = require('../../client/src/utils/globals');

// Should match client\src\components\TaskView.js const addRow = () => {...
class TaskSaveObjectDto {
  id: number;
  pid: number;
  name: string;
  url: string;
  last_start: number;
  num_pages: number;
  last_page: number;
  status: number;
  progress: null;
  product_structure: string;
  pagination_structure: string;
}

// class ProductStructureDto {
//   id: number;
//   selector: string;
//   type: number;
//   json: string;
//   openai_completions_id: number;
//   website_id: number;
// }

export class SemWebsiteDto {
  saveObjects: TaskSaveObjectDto[];
  //SemWebsite[]; // Obejects to create or update with save
  // productStructures: SemHtmlElementStructureDto;
  deleteIds: number[]; // Obejcts to delete from ids
}

@Injectable()
export class SemWebsiteService {
  private readonly logger = new Logger(SemWebsiteService.name);

  constructor(
    @InjectRepository(SemWebsite)
    private readonly semWebsiteRepository: Repository<SemWebsite>,
    private readonly semProcessService: SemProcessService,
    private readonly semProductSaleStatsService: SemProductSaleStatsService,
    @Inject(forwardRef(() => SemHtmlElementStructureService))
    private readonly semHtmlElementStructureService: SemHtmlElementStructureService,
    private readonly semOpenaiCompletionsService: SemOpenaiCompletionsService,
    @InjectRepository(SemProduct)
    private readonly semProductRepository: Repository<SemProduct>,
  ) {}

  /*
  findAll(): Promise<SemWebsite[]> {
    return this.semWebsiteRepository.find({
      relations: [
        'process',
        // 'htmlElements',
        // 'products',
        // 'htmlElementStructures',
      ],
    });
  }
  */
  findAll(): Promise<SemWebsite[]> {
    return this.semWebsiteRepository.find();
  }
  /*
  findAll(): Promise<SemProcess[]> {
    return this.semProcessRepository.find({ relations: ['websites'] });
  }
  */

  async findOne(id: number, relations: string[] = []): Promise<SemWebsite> {
    if (relations.length === 0) {
      relations = [
        'process',
        // 'htmlElements',
        // 'products',
        // 'htmlElementStructures',
      ];
    }

    return this.semWebsiteRepository.findOne({
      where: { id },
      relations: relations,
    });
  }

  async getProductUpdateCounters(): Promise<Array<object>> {

    const allSites = await this.findAll();
    let results = [];
    let startOfWeek = getStartOfWeekTimestamp();

    for(let i = 0;i < 13;i++,startOfWeek.subtract(7, 'days')){
      
      let dateStart = startOfWeek.format("YYYY-MM-DD");
      let dateEnd = moment(startOfWeek).add(7,'days').format("YYYY-MM-DD");
      // get added and deleted products on all sites without API.
      // we show the deleted products as estimated sales
      let addedOnAllSites = await this.semProductRepository.createQueryBuilder()
                            .select('*')
                            .innerJoin(SemWebsite, 'website', 'website.id = SemProduct.websiteId')
                            .where('website.api_alias IS NULL')
                            .andWhere('SemProduct.createdAt >= :dateStart', { dateStart: dateStart })
                            .andWhere('SemProduct.createdAt < :dateEnd', { dateEnd: dateEnd })
                            .getMany();
      let deletedOnAllSites = await this.semProductRepository.createQueryBuilder()
                            .withDeleted()
                            .select('*')
                            .innerJoin(SemWebsite, 'website', 'website.id = SemProduct.websiteId')
                            .where('website.api_alias IS NULL')
                            .andWhere('SemProduct.deletedAt >= :dateStart', { dateStart: dateStart })
                            .andWhere('SemProduct.deletedAt < :dateEnd', { dateEnd: dateEnd })
                            .getMany();      
      let stats = [];

      this.logger.log("addedOnAllSites.length " + dateStart + " - " + dateEnd, addedOnAllSites.length);
      this.logger.log("deletedOnAllSites.length " + dateStart + " - " + dateEnd, deletedOnAllSites.length);
      
      for(let s = 0;s < allSites.length;s++){
        let site = allSites[s];
        if(site.api_alias){
          // this site has an API , so it provides the number of units sold directly , 
          // no need to estimate from added and delete products
          this.logger.log("querying exact sales stats for site: ", site.name);
          let sales = await this.semProductSaleStatsService.sumAllByWebsiteIdAndWeek(site.id,startOfWeek.unix());
          this.logger.log("exact sales stats for site: ", site.name, sales);
          stats.push({
            site: site.name, 
            salesEstimate: sales });
        } else {
          let added = 0;
          let deleted = 0;
          for(let p = 0;p < addedOnAllSites.length;p++){
            this.logger.log(site.name + " addedOnAllSites[p]: ", addedOnAllSites[p]);
            if(addedOnAllSites[p]["websiteId"] === site.id){
              added++;
            }
          }
          for(let p = 0;p < deletedOnAllSites.length;p++){
            if(deletedOnAllSites[p]["websiteId"] === site.id){
              deleted++;
            }
          }
          stats.push({
            site: site.name, 
            added: added, 
            deleted: deleted,
            salesEstimate: deleted });
        }
      }

      results[i] = {
        week: dateStart + " - " + moment(startOfWeek).add(6,'days').format("YYYY-MM-DD"),
        stats
      };
        
    }

    this.logger.log("product sale stats results: ", results);

    return results;

  }

  async updateWebsiteField(
    // website: SemWebsite,
    websiteId: number,
    fieldName: string,
    newValue: any,
  ): Promise<SemWebsite> {
    const website = await this.findOne(websiteId);

    website[fieldName] = newValue; // Update the field
    await this.semWebsiteRepository.save(website); // Save the updated process

    return website;
  }

  async sync(websiteDto: SemWebsiteDto) {
    let deleteIds = websiteDto.deleteIds;

    // Handling saveObjects
    if (websiteDto.saveObjects.length > 0) {
      for (const object of websiteDto.saveObjects) {
        let website = await this.findOne(object.id);

        try {
          if (website) {
            await this.updateWebsiteField(website.id, 'message', '');
          }

          // Records that are in saveObjects must not be deleted
          deleteIds = deleteIds.filter((deleteId) => deleteId !== object.id);

          console.log('SemWebsiteService sync object: ', object);

          if (!website) {
            website = new SemWebsite();
            // Set the process relation using the process ID (pid)
            if (object.pid) {
              website.process = await this.semProcessService.findOne(
                object.pid,
              );
            }
          }
          website = { ...website, ...object };

          console.log('SemWebsiteService sync website: ', website);

          await this.semWebsiteRepository.save(website);

          if (object.product_structure) {
            // TODO Update if openaiCompletions can be added for specific websites
            const getProductStructureOpenaiCompletions =
              await this.semOpenaiCompletionsService.findOne(1); // getProductStructure

            await this.semHtmlElementStructureService.saveFromJSON(
              object.product_structure,
              HTML_ELEMENT_TYPE_PRODUCT,
              website,
              getProductStructureOpenaiCompletions,
            );
          }

          if (object.pagination_structure) {
            // TODO Update if openaiCompletions can be added for specific websites
            const getPaginationStructureOpenaiCompletions =
              await this.semOpenaiCompletionsService.findOne(4); // getProductStructure

            await this.semHtmlElementStructureService.saveFromJSON(
              object.pagination_structure,
              HTML_ELEMENT_TYPE_PAGINATION,
              website,
              getPaginationStructureOpenaiCompletions,
            );
          }
        } catch (error) {
          // console.error(`Failed to crawl: ${url}`, error);

          // Update the existing websiteLazy object instead of reassigning it
          // const website = await this.findOne(object.id);
          // if (website) {
          //   Object.assign(websiteLazy, website);
          // }

          const message: string = error.message;
          if (website) {
            await this.updateWebsiteField(website.id, 'message', message);
          }
        }
      }
    }

    // await this.semHtmlElementStructureService.sync(
    //   websiteDto.productStructures,
    // );

    // if (websiteDto.productStructures.length > 0) {
    //   for (const object of websiteDto.productStructures) {
    //     console.log('SemWebsiteService sync productStructure: ', object);

    //     let htmlElementStructure = new SemHtmlElementStructure();
    //     htmlElementStructure = { ...htmlElementStructure, ...object };

    //     // Set the process relation using the process ID (pid)
    //     if (object.website_id) {
    //       htmlElementStructure.website =
    //         await this.semWebsiteRepository.findOne(object.website_id);
    //     }
    //     console.log('SemWebsiteService sync website: ', website);

    //     await this.semHtmlElementStructureService.sync(htmlElementStructure);
    //   }
    // }

    // Handling deleteIds
    if (deleteIds.length > 0) {
      for (const deleteId of deleteIds) {
        // Check if the record exists
        const website = await this.findOne(deleteId);

        if (website) {
          // If the record exists, delete it
          await this.semWebsiteRepository.delete(deleteId);
        }
      }
    }
  }
}
