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
import { SemProductService, ProductStructure } from '../entities/sem_product.service';
import { Connection } from 'typeorm';
import { DinastycoinConfigService } from '../entities/dinastycoin_config.service';
import { CrawlerJsonApiService } from './crawler_json_api_service';
import { SemProductSaleStatsService } from '../entities/sem_product_sale_stats.service';
import { ServiceOpenaiService } from '../service_openai/service_openai.service';

@Injectable()
export class DinastycoinCrawlerService {
    
  constructor(
    private readonly semWebsiteService: SemWebsiteService,
    private readonly semProductService: SemProductService,
    private readonly semCurrencyService: SemCurrencyService,
    private readonly semCategoryService: SemCategoryService,
    private readonly dinastycoinConfigService: DinastycoinConfigService,
    private readonly semProductSaleStatsService: SemProductSaleStatsService,
    private readonly serviceOpenaiService: ServiceOpenaiService,
  ) {}

  async getApiClient(): Promise<CrawlerJsonApiService> {
    const dinastycoinConfig = await this.dinastycoinConfigService.findOneWithMaxId();
    return new CrawlerJsonApiService("api-key",dinastycoinConfig.apiKey);
  }

  async crawl(website: SemWebsite) {

    const apiClient = await this.getApiClient();

    let exchangeRatesEUR = {};

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

      if(full_product['pubblicato'] === "N" || full_product['donazione']){
        return;
      }
      
      let url = prod["Originalproductpath"] ? prod["Originalproductpath"] : null;
      if(!url){
        url = full_product['originalpath'] ? full_product['originalpath'] : "https://dinastycoin.club?art=" + prod.id;
      }

      if (!exchangeRatesEUR[full_product['coinmain']]) {
          let exchangeRateResponse = await apiClient.get<object>(`https://dinastycoin.club/apidcy/exchange/` + full_product['coinmain'] + `EUR`);
          const exchangeRate = Object.values(exchangeRateResponse)[0];
          exchangeRatesEUR[full_product['coinmain']] = parseFloat(exchangeRate);
      }
      
      let defaultThumbnailUrl = "https://dinastycoin.club/images/products/" + full_product['recordid'] + ".jpg";
      let thumbnailUrl = full_product["immagine1"] ? full_product["immagine1"] : defaultThumbnailUrl;
      if(!thumbnailUrl.startsWith("http")){
        thumbnailUrl = "https://dinastycoin.club/images/products/" + full_product['immagine1'];
      }

      const currency: SemCurrency = await this.semCurrencyService.getCurrencyFromString( full_product['coinmain'] , true );
    
      let productStructure: ProductStructure = {
        url: url,
        title: full_product["descrizione"],
        description: full_product["descrizionefull"],
        description_long: null,
        is_used: full_product["stato"] !== "N",
        thumbnailUrl:  thumbnailUrl,
        price_01: full_product['prezzoeuro'] / exchangeRatesEUR[full_product['coinmain']],
        currency_01_id: currency.id,
        price_02: null,
        currency_02_id: null,
        category_id: null,
        timestamp: Date.now(),
      }

      // now map Dinastycoin category to Sem category
      let allDinastycoinCategories = await this.getAllCategories();
      let dinastycoinCategoryPath = this.getCategoryPath(allDinastycoinCategories, full_product["categoriaid"]);

      const categoryName = await this.serviceOpenaiService.getProductCategory(
        productStructure.title + " (in categoria " + dinastycoinCategoryPath + ")<hr>" + productStructure.description,
        website,
      );
      console.log('Dinastycoin product [' + prod.id + '] ' + productStructure.title + '. categoryName = ' + categoryName);
      const category = await this.semCategoryService.findOneByName(categoryName);
      productStructure.category_id = category ? category.id : null;      
      
      // Find existing product by Url (it's unique)
      let product = await this.semProductService.findOneByUrl(
        productStructure.url,
      );
      let productAlreadyExist: boolean = product ? true : false;
      if (product) {
        product = await this.semProductService.updateProductTimestamp(
          product,
          productStructure.timestamp,
        );
      }
      if (!productAlreadyExist) {
        console.log('createProduct Dinastycoin');
        product = await this.semProductService.createProduct(
          productStructure,
          website,
        );
      }

      await this.semProductSaleStatsService.updateTotalSales(product.id, full_product["qtavendute"]);

    });

  }


  async getAllCategories(): Promise<object[]> {
    
    const apiClient = await this.getApiClient();
    
    let categories = [];
    
    let all_categories_result = await apiClient.get<object>(`https://dinastycoin.club/apidcy/catmarketplace?id=All`);
    let all_categories = all_categories_result['data'];

    all_categories.forEach(element => {
      this.insertIntoTree(categories, element);
    });

    return categories;
      
  }

  private insertIntoTree(tree: any[], element: any): boolean {
    // If parentid is 0, this is a root element - add directly to tree
    if (element.parentid === 0) {
      if (!element.children) {
        element.children = [];
      }
      tree.push(element);
      return true;
    }

    // Otherwise recursively search for parent
    for (let node of tree) {
      // Check if this node is the parent
      if (node.id === element.parentid) {
        if (!node.children) {
          node.children = [];
        }
        if (!element.children) {
          element.children = [];
        }
        node.children.push(element);
        return true;
      }
      
      // If node has children, recursively search them
      if (node.children && node.children.length > 0) {
        let result = this.insertIntoTree(node.children, element);
        if (result) {
          return true;
        }
      }
    }

    return false;

  }


  private getCategoryPath(categories: any[], categoryId: number): string {
    const findPath = (nodes: any[], id: number, currentPath: string[]): string[] | null => {
      for (const node of nodes) {
        if (node.id === id) {
          return [...currentPath, node.descrizione];
        }
        
        if (node.children && node.children.length > 0) {
          const path = findPath(node.children, id, [...currentPath, node.descrizione]);
          if (path) {
            return path;
          }
        }
      }
      return null;
    };

    const path = findPath(categories, categoryId, []);
    if (!path) {
      return '';
    }

    return path.join(' > ');
  }

}


