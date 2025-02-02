import { Controller, Get, Param, Query } from '@nestjs/common';
import { SemProductService } from './sem_product.service';

const {
  CONTROLLER_PRODUCT_ID,
  CONTROLLER_PRODUCT_TITLE,
} = require('../../client/src/utils/globals');

@Controller(CONTROLLER_PRODUCT_ID)
export class SemProductController {
  constructor(private readonly semProductService: SemProductService) {}

  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
    @Query('category_ids') category_ids?: string,
    @Query('currencies') currencies?: string,
    @Query('usedOrNew') usedOrNew?: string,
    @Query('withImageOnly') withImageOnly?: string
  ) {
    return this.semProductService.findAll(
      page,
      limit,
      search,
      category_ids,
      currencies,
      usedOrNew,
      withImageOnly
    );
  }

  @Get(CONTROLLER_PRODUCT_TITLE)
  findTitlesBySearch(
    @Query('search') search: string,
    // @Query('limit') limit: number,
  ) {
    return this.semProductService.findTitlesBySearch(search); //, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.semProductService.findOne(+id);
  }
}
