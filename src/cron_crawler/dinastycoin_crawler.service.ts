import { Injectable, Inject, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as appRoot from 'app-root-path';
import { SemCurrency } from '../entities/sem_currency.entity';
import { SemProduct } from '../entities/sem_product.entity';
import { SemCategory } from '../entities/sem_category.entity';
import { SemCurrencyService } from '../entities/sem_currency.service';
import { SemCategoryService } from '../entities/sem_category.service';
import { SemWebsite } from '../entities/sem_website.entity';
import { SemWebsiteService } from '../entities/sem_website.service';
import { SemProductService } from '../entities/sem_product.service';
import { Connection } from 'typeorm';
import { DinastycoinConfigService } from '../entities/dinastycoin_config.service';
import { CrawlerJsonApiService } from './crawler_json_api_service';

@Injectable()
export class DinastycoinCrawlerService {
    
  constructor(
    private readonly semWebsiteService: SemWebsiteService,
    private readonly semProductService: SemProductService,
    private readonly semCurrencyService: SemCurrencyService,
    private readonly semCategoryService: SemCategoryService,
    private readonly dinastycoinConfigService: DinastycoinConfigService,
  ) {}

  async crawl(website: SemWebsite) {

    let exchangeRatesEUR = {};

    const dinastycoinConfig = await this.dinastycoinConfigService.findOneWithMaxId();

    const apiClient = new CrawlerJsonApiService("api-key",dinastycoinConfig.apiKey);

    const productsList = await apiClient.get<object>("https://dinastycoin.club/apidcy/productlist?coin=all");

    const productsListData = productsList['data'];
    if (!productsListData) {
      throw new Error('No data field found in catmarketplace response');
    }

    productsListData.forEach(async (prod) => {
      
        console.log(prod);
        let full_product = await apiClient.get<object>(`https://dinastycoin.club/apidcy/marketplace?productid=${prod.id}`);
        console.log("full: ", full_product);
        full_product = full_product['data'];

        if (!exchangeRatesEUR[full_product['coinmain']]) {
            let exchangeRateResponse = await apiClient.get<object>(`https://dinastycoin.club/apidcy/exchange/` + full_product['coinmain'] + `EUR`);
            const exchangeRate = Object.values(exchangeRateResponse)[0];
            exchangeRatesEUR[full_product['coinmain']] = parseFloat(exchangeRate);
        }

        full_product['prezzo'] = full_product['prezzoeuro'] / exchangeRatesEUR[full_product['coinmain']];
        
        if(!full_product['"originalpath"']){
            full_product['originalpath'] = "https://dinastycoin.club?art=" + prod.id;
        }

    });

  }

}


