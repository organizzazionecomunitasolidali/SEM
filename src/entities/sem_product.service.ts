import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SemProduct } from '../entities/sem_product.entity';
import { SemProductThumbnail } from '../entities/sem_product_thumbnail.entity';
import { SemWebsite } from '../entities/sem_website.entity';
import * as fs from 'fs';
import * as path from 'path';
import { hashString, getClientDir, getClientPublicDir } from '../utils/globals';
import * as sharp from 'sharp';

const {
  VIEW_PRODUCT_ITEMS_PER_PAGE,
  VIEW_PRODUCT_SEARCH_TITLES_LIMIT,
} = require('../../client/src/utils/globals');

export interface ProductStructure {
  url: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  description_long: string;
  price_01: number;
  currency_01_id: number;
  price_02: number;
  currency_02_id: number;
  category_id: number;
  is_used : Boolean;
  timestamp: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

const axios = require('axios');

@Injectable()
export class SemProductService {
  constructor(
    @InjectRepository(SemProduct)
    private readonly semProductRepository: Repository<SemProduct>,
    @InjectRepository(SemProductThumbnail)
    private readonly semProductThumbnailRepository: Repository<SemProductThumbnail>
  ) {}

  async findAll(
    page: number = 1,
    limit: number = VIEW_PRODUCT_ITEMS_PER_PAGE,
    search?: string,
    category_ids?: string,
    currencies?: string,
    usedOrNew?: string,
    withImageOnly?: string
  ): Promise<PaginatedResult<SemProduct>> {
    const query = this.semProductRepository.createQueryBuilder('product').where("is_available = 1");

    if (search) {
      query.andWhere('product.title LIKE :search', { search: `%${search}%` });
    }

    if (category_ids) {
      
      let categoryCondition = '(';
      let or = "";

      category_ids.split(",").forEach((value,index) => {
        categoryCondition += or + 'product.category_id = ' + parseInt(value);
        or = " OR ";
      });

      categoryCondition += ')';      
      query.andWhere(categoryCondition);
      
    }

    if (currencies) {
      const currencyIds = currencies.split(',').map(Number);
      const currencyCondition = `((product.currency_01_id IN (:...currencyIds) AND product.price_01 >= 0) OR (product.currency_02_id IN (:...currencyIds) AND product.price_02 >= 0))`;
      query.andWhere(currencyCondition, { currencyIds });
    }

    let where = "TRUE";
    if(usedOrNew == "newOnly"){
      where = "(product.is_used IS NULL OR product.is_used = 0)";
    } else if(usedOrNew == "usedOnly"){
      where = "product.is_used = 1";
    } 
    if(withImageOnly == "" || withImageOnly == "yes" || withImageOnly == "true"){
      query.andWhere("product.has_real_product_thumbnail = 1");
    }
    
    let [results, total] = await query
      .innerJoinAndSelect('product.website', 'website')
      .leftJoinAndSelect('sem_currency','currency_01','currency_01.id = product.currency_01_id AND (currency_01.name = :name OR product.is_value_in_EUR_constant = 1) AND product.price_01 >= 0.01', { name: 'Euro' })
      .select(['product', 'website.name'])
      .addSelect("IIF(product.is_value_in_EUR_constant = 1,'Euro',currency_01.name) = :name", 'euro') 
      .andWhere(where)
      .orderBy({
        'product.is_used' : usedOrNew == "usedFirst" ? 'DESC' : 'ASC',
        'euro' : 'DESC',
        'product.random_ordering' : 'ASC'
      })
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
      
      /* // without ordering by Euro
    let [results, total] = await query
    .innerJoinAndSelect('product.website', 'website')
    .select(['product', 'website.name'])
    .andWhere(where)
    .orderBy({
      'product.is_used' : usedOrNew == "usedFirst" ? 'DESC' : 'ASC',
      'product.createdAt' : 'DESC'
    })
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();
    */
    
    console.log("product findall " + results.length);

    const totalPages = Math.ceil(total / limit);

    // add thumbnail urls if available.
    for(let i = 0;i < results.length;i++){
      const url_hash = hashString(results[i].url);
      const existingThumbnail = await this.semProductThumbnailRepository.findOne({ where: {url_hash: url_hash}});
      if(existingThumbnail){
        results[i].thumbnail_url = this.getThumbnailUrlFromHash(url_hash);
        // replace extension in results[i].thumbnail_url with .webp if it is not already
        results[i].thumbnail_url = results[i].thumbnail_url.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
      }
    }

    return {
      data: results,
      total,
      page,
      totalPages,
    };
  }

  async findTitlesBySearch(
    search: string,
    // limit: number = VIEW_PRODUCT_SEARCH_TITLES_LIMIT,
  ): Promise<{ id: number; title: string; url: string }[]> {
    const query = this.semProductRepository.createQueryBuilder('product');

    if (search) {
      query.where('product.title LIKE :search', { search: `%${search}%` });
    }

    const products = await query
      .select(['product.id', 'product.title', 'product.url'])
      .limit(VIEW_PRODUCT_SEARCH_TITLES_LIMIT)
      .getMany();

    return products.map((product) => ({
      id: product.id,
      title: product.title,
      url: product.url,
    }));
  }

  async findOne(id: number): Promise<SemProduct> {
    return this.semProductRepository.findOne({
      where: { id },
    });
  }

  async findOneByUrl(url: string): Promise<SemProduct> {
    return this.semProductRepository.findOne({
      where: {
        url: url,
      },
    });
  }

  getThumbnailUrlFromHash(hash){
    return process.env.CORS_ORIGIN + `/product_images/${hash}.jpg`;
  }

  getFullThumbnailPathFromHash(hash){
    const imagesDir = path.join(getClientDir(), 'product_images');
    // Ensure the directory exists
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    return path.join(imagesDir, `${hash}.jpg`);
  }

  async downloadText(url) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error downloading the text from' + url + ":", error);
      return null;
    }
  }

  async downloadImage(url) {
    try {
      if (url.startsWith('file://')) {
        // Handle local file URL
        const filePath = url.replace('file://', ''); // Remove the "file://" part
        const fileData = fs.readFileSync(filePath); // Read the file as a buffer
        return fileData;
      } else {
        // Handle remote HTTP URL
        const response = await axios.get(url, {
          responseType: 'arraybuffer', // This ensures the response is a Buffer
        });
        
        return Buffer.from(response.data, 'binary');
      }
    } catch (error) {
      console.error('Error downloading the image ' + url + ' :', error);
      return null;
    }
  }

  async createProduct(
    productStructure: ProductStructure,
    website: SemWebsite,
  ): Promise<SemProduct> {
    
    const newProduct = this.semProductRepository.create({
      url: productStructure.url,
      thumbnail: null,
      title: productStructure.title,
      description: productStructure.description,
      price_01: productStructure.price_01,
      currency_01_id: productStructure.currency_01_id,
      price_02: productStructure.price_02,
      currency_02_id: productStructure.currency_02_id,
      category_id: productStructure.category_id,
      is_used: productStructure.is_used,
      timestamp: productStructure.timestamp,
      website: website
    });
    await this.semProductRepository.createQueryBuilder()
    .insert()
    .into(SemProduct)
    .values(newProduct)
    .orIgnore()
    .execute();
    
    await this.updateProductThumbnail(newProduct, productStructure.thumbnailUrl);

    return newProduct;
  }


  async updateProductThumbnail(product: SemProduct, product_thumbnail_url: string, force_update_if_existing: boolean = false, log = false){

    const url_hash = hashString(product.url);

    // create thumbnail record if it does not exist
    let existingThumbnail = await this.semProductThumbnailRepository.findOne({ where: {url_hash: url_hash}});
    const imagePath = this.getFullThumbnailPathFromHash(url_hash);
    // Check if thumbnail image file already exists
    if (!existingThumbnail || product_thumbnail_url.indexOf("data:") == 0 || !fs.existsSync(imagePath)) {
      existingThumbnail = null;
    }

    // temp debug
    if(log){
      console.log("updateProductThumbnail existingThumbnail:" + existingThumbnail);
      console.log("updateProductThumbnail url:" + product.url);
      console.log("updateProductThumbnail product_thumbnail_url:" + product_thumbnail_url);
      console.log("updateProductThumbnail force_update_if_existing:" + force_update_if_existing);
    }
    // temp debug end

    if(!existingThumbnail || force_update_if_existing){

      const no_image_url = "file://" + path.join(getClientDir(), 'image_not_found.png');
      let thumbnailImageBuffer = product_thumbnail_url ? await this.downloadImage(
          product_thumbnail_url
      ) : null;
      if(!thumbnailImageBuffer){
        thumbnailImageBuffer = await this.downloadImage(no_image_url);
        product.has_real_product_thumbnail = false;
      }    

      // now download thumbnail data from thumbnailImageBuffer into <project root dir>/client/public/procuct_images/<url_hash>.jpg
      // Define the directory and file path for saving the image
      // Write the thumbnail image to the file system
      fs.writeFileSync(imagePath, thumbnailImageBuffer, { flag: 'w' });
      await this.convertProductImageToWebp(imagePath);

      if(!existingThumbnail){
        const newThumb = await this.semProductThumbnailRepository.create({
          url_hash: url_hash,
          url: product.url
        });
        await this.semProductThumbnailRepository.createQueryBuilder()
        .insert()
        .into(SemProductThumbnail)
        .values(newThumb)
        .orIgnore()
        .execute();
      } else {
        existingThumbnail.url_hash = url_hash;
        await this.semProductThumbnailRepository.save(existingThumbnail);
      }

    }
  }
  
  async convertProductImageToWebp(imageFullPath: string){
    const imageBuffer = fs.readFileSync(imageFullPath);
    const image = sharp(imageBuffer,{ failOn: "truncated"});

    // Replace extension with .webp
    const webpPath = imageFullPath.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
    
    // Get image metadata to check dimensions
    const metadata = await image.metadata();

    let resized_data = image;
    
    // Only resize if width is over 400px
    if (metadata.width > 400) {
      try {
        resized_data = await image
          .resize(400, null, {
            fit: 'inside', // Maintains aspect ratio
            withoutEnlargement: true, // Prevents upscaling
          });
      } catch(error){
        console.error('Error resizing image , we then keep the original size:', error);
      }
    }
    
    // Convert to webp
    const webpBuffer = await resized_data.webp().toBuffer();      
    fs.writeFileSync(webpPath, webpBuffer, { flag: 'w' });
    
  }

  async updateProductTimestamp(
    product: SemProduct,
    timestamp: number,
  ): Promise<SemProduct> {
    product['timestamp'] = timestamp; // Update the field
    product['random_ordering'] = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER); // When a product gets updated, we randomize its ordering with an integer between 0 and MAX_SAFE_INTEGER
    await this.semProductRepository.save(product); // Save the updated product
    return product;
  }

  async updateProductAvailability(
    product: SemProduct,
    is_available: Boolean,
  ): Promise<SemProduct> {
    product['is_available'] = is_available; // Update the field
    await this.semProductRepository.save(product); // Save the updated product
    return product;
  }

  async updateProductPrice(
    product: SemProduct,
    price_01: number,
    price_02: number = null, // optional
    is_value_in_EUR_constant: Boolean = null,
  ): Promise<SemProduct> {
    product['price_01'] = price_01; // Update the field
    product['price_02'] = price_02; // Update the field
    product['is_value_in_EUR_constant'] = is_value_in_EUR_constant;
    await this.semProductRepository.save(product); // Save the updated product
    return product;
  }

  async updateProductAvailabilityOfWebsite(
    websiteId: number,
    is_available: Boolean,
  ) {
    await this.semProductRepository.createQueryBuilder()
    .update(SemProduct)
    .set({ is_available: is_available })
    .andWhere('websiteId = :websiteId', { websiteId })
    .execute();
  }

  async deleteOlderThan(timestamp: number, website: SemWebsite, isSoftDelete: boolean): Promise<void> {
    const websiteId = website.id;
    const query = isSoftDelete ? this.semProductRepository.createQueryBuilder().softDelete() : this.semProductRepository.createQueryBuilder().delete();
    await query.from(SemProduct)
      .where('timestamp < :timestamp', { timestamp })
      .andWhere('websiteId = :websiteId', { websiteId })
      .execute();
  }

  async softDelete(id: number) {
    await this.semProductRepository.softDelete(id);
  }

  async delete(id: number) {
    await this.semProductRepository.delete(id);
  }
}
