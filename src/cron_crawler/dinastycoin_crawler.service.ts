import { Injectable, Inject, Logger } from '@nestjs/common';
import { SemCurrency } from '../entities/sem_currency.entity';
import { SemCurrencyService } from '../entities/sem_currency.service';
import { SemCategoryService } from '../entities/sem_category.service';
import { SemWebsite } from '../entities/sem_website.entity';
import { SemProductService, ProductStructure } from '../entities/sem_product.service';
import { SemDinastycoinConfigService } from '../entities/sem_dinastycoin_config.service';
import { SemDinastycoinConfig } from '../entities/sem_dinastycoin_config.entity';
import { CrawlerJsonApiService } from './crawler_json_api_service';
import { SemProductSaleStatsService } from '../entities/sem_product_sale_stats.service';
import { ServiceOpenaiService } from '../service_openai/service_openai.service';

@Injectable()
export class DinastycoinCrawlerService {

  private apiClient: CrawlerJsonApiService;
    
  constructor(
    private readonly semProductService: SemProductService,
    private readonly semCurrencyService: SemCurrencyService,
    private readonly semCategoryService: SemCategoryService,
    private readonly dinastycoinConfigService: SemDinastycoinConfigService,
    private readonly semProductSaleStatsService: SemProductSaleStatsService,
    private readonly serviceOpenaiService: ServiceOpenaiService,
  ) {}

  async getApiClient(): Promise<CrawlerJsonApiService> {
    if(!this.apiClient){
      let dinastycoinConfig: SemDinastycoinConfig = await this.dinastycoinConfigService.findOneWithMaxId();
      this.apiClient = new CrawlerJsonApiService("api-key",dinastycoinConfig.apiKey,null,dinastycoinConfig.signature);
    }
    return this.apiClient;
  }

  async crawl(website: SemWebsite, limit_product_creation: number = 20) {

    const apiClient = await this.getApiClient();

    let exchangeRatesEUR = {};
    let productsCreated = 0;

    try {

      const allDinastycoinCategories = await this.getAllCategories();
      const productsList = await this.getAllProductsList();

      // flag all products as unavailable for this site. then we will update them as available if they are
      await this.semProductService.updateProductAvailabilityOfWebsite(website.id, false);

      productsList.forEach(async (prod) => {

        if(productsCreated >= limit_product_creation){
          return;
        }
        if(prod["qtydisp"] === 0){
          return;
        }
        
        console.log(prod);
        let full_product = await apiClient.get<object>(`https://dinastycoin.club/apidcy/ecom/marketplace?productid=${prod["Id"]}`);
        full_product = full_product["data"] ? full_product["data"] : full_product;
        console.log("full: ", full_product);

        if(full_product['pubblicato'] === "N" || full_product['donazione']){
          return;
        }
        
        let url = prod["Originalproductpath"] ? prod["Originalproductpath"] : null;
        if(!url){
          url = full_product['originalpath'] ? full_product['originalpath'] : "https://dinastycoin.club?art=" + prod["id"];
        }

        if (!exchangeRatesEUR[full_product['coinmain']]) {
          let exchangeRateResponse = await apiClient.get<object>(`https://dinastycoin.club/apidcy/exchange/` + full_product['coinmain'] + `EUR`);
          const exchangeRate = Object.values(exchangeRateResponse)[0];
          exchangeRatesEUR[full_product['coinmain']] = parseFloat(exchangeRate);
        }
        const price_01 = full_product['prezzoeuro'] / exchangeRatesEUR[full_product['coinmain']];

        // Find existing product by Url (it's unique)
        let product = await this.semProductService.findOneByUrl(
          url,
        );
        let productAlreadyExist: boolean = product ? true : false;
        if (product) {
          await this.semProductService.updateProductPrice(
            product,
            price_01,
          );
          product = await this.semProductService.updateProductAvailability(
            product,
            true,
          );
          product = await this.semProductService.updateProductTimestamp(
            product,
            Date.now()
          );
        }

        if (!productAlreadyExist) {
          
          let defaultThumbnailUrl = "https://dinastycoin.club/images/products/" + full_product['recordid'] + ".jpg";
          let thumbnailUrl = prod["mainimage"] ? prod["mainimage"] : null;
          thumbnailUrl = full_product["immagine1"] ? full_product["immagine1"] : thumbnailUrl;
          thumbnailUrl = thumbnailUrl ? thumbnailUrl : defaultThumbnailUrl;
          if(!thumbnailUrl.startsWith("http")){
            thumbnailUrl = "https://dinastycoin.club/images/products/" + thumbnailUrl;
          }

          const currency: SemCurrency = await this.semCurrencyService.getCurrencyFromString( full_product['coinmain'] , true );
        
          let productStructure: ProductStructure = {
            url: url,
            title: full_product["descrizione"],
            description: full_product["descrizionefull"],
            description_long: null,
            is_used: full_product["stato"] !== "N",
            thumbnailUrl:  thumbnailUrl,
            price_01: price_01,
            currency_01_id: currency.id,
            price_02: null,
            currency_02_id: null,
            category_id: null,
            timestamp: Date.now(),
          }

          // now map Dinastycoin category to Sem category
          let dinastycoinCategoryPath = this.getCategoryPath(allDinastycoinCategories, full_product["categoriaid"]);
          const categoryName = await this.serviceOpenaiService.getProductCategory(
            productStructure.title + " (in categoria " + dinastycoinCategoryPath + ")<hr>" + productStructure.description,
            website,
          );
          console.log('Dinastycoin product [' + prod["id"] + '] ' + productStructure.title + '. categoryName = ' + categoryName);
          const category = await this.semCategoryService.findOneByName(categoryName);
          productStructure.category_id = category ? category.id : null;      
        
          console.log('createProduct Dinastycoin');
          product = await this.semProductService.createProduct(
            productStructure,
            website,
          );

          productsCreated++;

        }

        await this.semProductSaleStatsService.updateTotalSales(product.id, full_product["qtavendute"]);

      });

    } catch (error) {
      console.error('Error in DinastycoinCrawlerService.crawl', error);
    }

  }


  async getAllCategories(): Promise<object[]> {
    
    const apiClient = await this.getApiClient();
    
    let categories = [];
    
    let all_categories_result = await apiClient.get<object>(`https://dinastycoin.club/apidcy/ecom/catmarketplace?id=All`);
    let all_categories: object[] = all_categories_result["data"] ? all_categories_result["data"] : all_categories_result;

    all_categories.forEach(element => {
      this.insertIntoTree(categories, element);
    });

    return categories;
      
  }


  async getAllProductsList(): Promise<object[]> {
    const apiClient = await this.getApiClient();
    const productsList = await apiClient.post<object[]>("https://dinastycoin.club/apidcy/ecom/productlist?coin=all",{stato: "A"});
    if (!productsList) {
      throw new Error('No data field found in catmarketplace response');
    }
    return productsList["data"] ? productsList["data"] : productsList;
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


