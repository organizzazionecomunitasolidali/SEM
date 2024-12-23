import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MemoryDatabaseModule } from './database/memory_database.module';
import { MemoryDatabaseMiddleware } from './database/memory_database.middleware';
// import { SemProcessService } from './entities/sem_process.service';
import { SemCategoryController } from './entities/sem_category.controller';
import { SemHtmlElementStructureController } from './entities/sem_html_element_structure.controller';
import { SemWebsiteController } from './entities/sem_website.controller';
import { SemCurrencyController } from './entities/sem_currency.controller';
import { SemProductController } from './entities/sem_product.controller';
import { SemProcessController } from './entities/sem_process.controller';
import { ServiceOpenaiService } from './service_openai/service_openai.service';
import { ServiceOpenaiController } from './service_openai/service_openai.controller';
import { FixturesController } from './fixtures/fixtures.controller';
import { FixturesService } from './fixtures/fixtures.service';
import { AuthModule } from './auth/auth.module';
import { SemOpenaiCompletionsController } from './entities/sem_openai_completions.controller';
import { CronCrawlerService } from './cron_crawler/cron_crawler.service';
import { DinastycoinCrawlerService } from './cron_crawler/dinastycoin_crawler.service';
// import { SemWebsiteService } from './entities/sem_website.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    MemoryDatabaseModule,
    AuthModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    ServiceOpenaiController,
    SemProcessController,
    SemOpenaiCompletionsController,
    SemProductController,
    SemCurrencyController,
    SemCategoryController,
    SemWebsiteController,
    SemHtmlElementStructureController,
    FixturesController,
  ],
  providers: [
    AppService,
    ServiceOpenaiService,
    FixturesService,
    CronCrawlerService,
    DinastycoinCrawlerService,
    // SemWebsiteService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MemoryDatabaseMiddleware).forRoutes('*');
  }
}
