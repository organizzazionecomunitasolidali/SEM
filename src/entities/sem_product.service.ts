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


  async updateProductThumbnail(product: SemProduct, product_thumbnail_url: string, force_update_if_existing: boolean = false){

    const placeholder_urls_for_missing_thumbnails = [
      "data:image/png;base64,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"
    ];
    
    for(let i = 0;i < placeholder_urls_for_missing_thumbnails.length;i++){
      if(placeholder_urls_for_missing_thumbnails[i] == product_thumbnail_url){
        product_thumbnail_url = null;
        break;
      }
    }

    const url_hash = hashString(product.url);

    // create thumbnail record if it does not exist
    let existingThumbnail = await this.semProductThumbnailRepository.findOne({ where: {url_hash: url_hash}});
    const imagePath = this.getFullThumbnailPathFromHash(url_hash);
    // Check if thumbnail image file already exists
    if (!existingThumbnail || !fs.existsSync(imagePath)) {
      existingThumbnail = null;
    }
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
