import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SemCategory } from '../entities/sem_category.entity';
import { SemCategoryService } from '../entities/sem_category.service';
import { SemCurrency } from '../entities/sem_currency.entity';
import { SemCurrencyService } from '../entities/sem_currency.service';
import { SemHtmlElement } from '../entities/sem_html_element.entity';
import { SemHtmlElementService } from '../entities/sem_html_element.service';
import { SemOpenaiCompletions } from '../entities/sem_openai_completions.entity';
import { SemOpenaiCompletionsService } from '../entities/sem_openai_completions.service';
import { SemOpenaiCompletionsRequest } from '../entities/sem_openai_completions_request.entity';
import { SemOpenaiCompletionsRequestService } from '../entities/sem_openai_completions_request.service';
import { SemProcess } from '../entities/sem_process.entity';
import { SemProcessService } from '../entities/sem_process.service';
import { SemHtmlElementStructure } from '../entities/sem_html_element_structure.entity';
import { SemHtmlElementStructureService } from '../entities/sem_html_element_structure.service';
import { SemProduct } from '../entities/sem_product.entity';
import { SemProductThumbnail } from '../entities/sem_product_thumbnail.entity';
import { SemProductService } from '../entities/sem_product.service';
import { SemWebsite } from '../entities/sem_website.entity';
import { SemWebsiteService } from '../entities/sem_website.service';
import { SemDinastycoinConfig } from '../entities/sem_dinastycoin_config.entity';
import { SemDinastycoinConfigService } from '../entities/sem_dinastycoin_config.service';
import { SemProductSaleStats } from '../entities/sem_product_sale_stats.entity';
import { SemProductSaleStatsService } from '../entities/sem_product_sale_stats.service';
import { SemDebugLog } from 'src/entities/sem_debug_log.entity';
import { SemDebugLogService } from 'src/entities/sem_debug_log.service';
import { join } from 'path';
import * as appRoot from 'app-root-path';
import * as path from 'path';
import * as fs from 'fs';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbRelativePath = configService.get<string>('DB_RELATIVE_PATH');
        console.log('DB_RELATIVE_PATH: ', dbRelativePath);
        if (!dbRelativePath) {
          throw new Error(
            'DB_RELATIVE_PATH is not defined in the environment variables',
          );
        }

        // Check if the subfolder exists; if not, create it
        const databasePath = path.join(appRoot.path, dbRelativePath);
        console.log('databasePath: ', databasePath);

        return {
          type: 'sqlite',
          database: databasePath,
          entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
          synchronize: true,
          logging: true,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      SemCategory,
      SemCurrency,
      SemHtmlElement,
      SemProcess,
      SemHtmlElementStructure,
      SemProduct,
      SemProductThumbnail,
      SemWebsite,
      SemOpenaiCompletions,
      SemOpenaiCompletionsRequest,
      SemDinastycoinConfig,
      SemProductSaleStats,
      SemDebugLog,
    ]),
  ],
  providers: [
    SemHtmlElementService,
    SemOpenaiCompletionsService,
    SemOpenaiCompletionsRequestService,
    SemWebsiteService,
    // {
    //   provide: SemWebsiteService,
    //   useFactory: (
    //     semWebsiteRepository: Repository<SemWebsite>,
    //     semProcessService: SemProcessService,
    //     semHtmlElementStructureService: SemHtmlElementStructureService,
    //   ) =>
    //     new SemWebsiteService(
    //       semWebsiteRepository,
    //       semProcessService,
    //       semHtmlElementStructureService,
    //     ),
    //   inject: [
    //     getRepositoryToken(SemWebsite),
    //     SemProcessService,
    //     forwardRef(() => SemHtmlElementStructureService),
    //   ],
    // },
    SemHtmlElementStructureService,
    // {
    //   provide: SemHtmlElementStructureService,
    //   useFactory: (
    //     semHtmlElementStructureRepository: Repository<SemHtmlElementStructure>,
    //     semWebsiteService: SemWebsiteService,
    //     semOpenaiCompletionsService: SemOpenaiCompletionsService,
    //   ) =>
    //     new SemHtmlElementStructureService(
    //       semHtmlElementStructureRepository,
    //       semWebsiteService,
    //       semOpenaiCompletionsService,
    //     ),
    //   inject: [
    //     getRepositoryToken(SemHtmlElementStructure),
    //     forwardRef(() => SemWebsiteService),
    //     SemOpenaiCompletionsService,
    //   ],
    // },
    SemProcessService,
    SemProductService,
    SemCurrencyService,
    SemCategoryService,
    SemDinastycoinConfigService,
    SemProductSaleStatsService,
    SemDebugLogService,
    {
      provide: 'PERSISTENT_DATABASE_CONNECTION',
      useFactory: async (connection: Connection) => connection,
      inject: [Connection],
    },
  ],
  exports: [
    TypeOrmModule, 
    'PERSISTENT_DATABASE_CONNECTION',
    SemHtmlElementService,
    SemOpenaiCompletionsService,
    SemOpenaiCompletionsRequestService,
    SemWebsiteService,
    SemHtmlElementStructureService,
    // forwardRef(() => SemWebsiteService),
    // forwardRef(() => SemHtmlElementStructureService),
    SemProcessService,
    SemProductService,
    SemCurrencyService,
    SemCategoryService,
    SemDinastycoinConfigService,
    SemProductSaleStatsService,
    SemDebugLogService,
  ],
})
export class DatabaseModule {}
