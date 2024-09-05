import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SemProduct } from '../entities/sem_product.entity';
import { SemProductThumbnail } from '../entities/sem_product_thumbnail.entity';
import { SemWebsite } from '../entities/sem_website.entity';
import * as fs from 'fs';
import * as path from 'path';
import { hashString, GetRequestedDomain } from 'src/utils/globals';

const {
  VIEW_PRODUCT_ITEMS_PER_PAGE,
  VIEW_PRODUCT_SEARCH_TITLES_LIMIT,
} = require('../../client/src/utils/globals');
// import * as axios from 'axios';

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
  ): Promise<PaginatedResult<SemProduct>> {
    const query = this.semProductRepository.createQueryBuilder('product');

    if (search) {
      query.where('product.title LIKE :search', { search: `%${search}%` });
    }
    if (category_ids) {
      
      let categoryCondition = '(';
      let or = "";

      category_ids.split(",").forEach((value,index) => {
        categoryCondition += or + 'product.category_id = ' + parseInt(value);
        or = " OR ";
      });

      categoryCondition += ')';

      if (search) {
        query.andWhere(categoryCondition);
      } else {
        query.where(categoryCondition);
      }
    }
    if (currencies) {
      const currencyIds = currencies.split(',').map(Number);
      const currencyCondition = `((product.currency_01_id IN (:...currencyIds) AND product.price_01 >= 0) OR (product.currency_02_id IN (:...currencyIds) AND product.price_02 >= 0))`;

      if (search || category_ids) {
        query.andWhere(currencyCondition, { currencyIds });
      } else {
        query.where(currencyCondition, { currencyIds });
      }
    }
    
    let [results, total] = await query
      .innerJoinAndSelect('product.website', 'website')
      .select(['product', 'website.name'])
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    // add thumbnail urls if available
    for(let i = 0;i < results.length;i++){
      const url_hash = hashString(results[i].url);
      const existingThumbnail = await this.semProductThumbnailRepository.findOne({ where: {url_hash: url_hash}});
      if(existingThumbnail){
        results[i].thumbnail_url = this.getThumbnailUrlFromHash(url_hash);
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
    return "https://" + GetRequestedDomain() + `/product_images${hash}.jpg`;
  }

  getFullThumbnailPathFromHash(hash){
    const imagesDir = path.join(process.cwd(), 'client/public/product_images');
    // Ensure the directory exists
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    return path.join(imagesDir, `${hash}.jpg`);
  }

  async downloadImage(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer', // This ensures the response is a Buffer
      });

      return Buffer.from(response.data, 'binary');
    } catch (error) {
      console.error('Error downloading the image:', error);
      return null;
    }
  }

  async createProduct(
    productStructure: ProductStructure,
    website: SemWebsite,
  ): Promise<SemProduct> {
    const thumbnailImageBuffer = await this.downloadImage(
      productStructure.thumbnailUrl,
    );

    const newProduct = this.semProductRepository.create({
      url: productStructure.url,
      thumbnail: thumbnailImageBuffer,
      title: productStructure.title,
      description: productStructure.description,
      price_01: productStructure.price_01,
      currency_01_id: productStructure.currency_01_id,
      price_02: productStructure.price_02,
      currency_02_id: productStructure.currency_02_id,
      category_id: productStructure.category_id,
      timestamp: productStructure.timestamp,
      website: website
    });
    await this.semProductRepository.createQueryBuilder()
    .insert()
    .into(SemProduct)
    .values(newProduct)
    .orIgnore()
    .execute();

    const url_hash = hashString(productStructure.url);

    // create thumbnail record if it does not exist
    const existingThumbnail = await this.semProductThumbnailRepository.findOne({ where: {url_hash: url_hash}});
    if(!existingThumbnail){

      // now download thumbnail data from thumbnailImageBuffer into <project root dir>/client/public/procuct_images/<url_hash>.jpg
      // Define the directory and file path for saving the image
      const imagePath = this.getFullThumbnailPathFromHash(url_hash);
      // Write the thumbnail image to the file system
      fs.writeFileSync(imagePath, thumbnailImageBuffer);

      const newThumb = await this.semProductThumbnailRepository.create({
        url_hash: url_hash,
        url: productStructure.url
      });
      await this.semProductThumbnailRepository.createQueryBuilder()
      .insert()
      .into(SemProductThumbnail)
      .values(newThumb)
      .orIgnore()
      .execute();

    }

    return newProduct;
  }

  async updateProductTimestamp(
    product: SemProduct,
    timestamp: number,
  ): Promise<SemProduct> {
    product['timestamp'] = timestamp; // Update the field
    await this.semProductRepository.save(product); // Save the updated process
    return product;
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
