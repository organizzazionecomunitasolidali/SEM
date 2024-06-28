import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { SemWebsiteService, SemWebsiteDto } from './sem_website.service';

const {
  CONTROLLER_WEBSITE_ID,
  CONTROLLER_WEBSITE_SYNC,
  CONTROLLER_WEBSITE_COUNTERS
} = require('../../client/src/utils/globals');

@Controller(CONTROLLER_WEBSITE_ID)
export class SemWebsiteController {
  constructor(private readonly semWebsiteService: SemWebsiteService) {}

  @Get()
  findAll() {
    return this.semWebsiteService.findAll();
  }

  @Get(CONTROLLER_WEBSITE_COUNTERS)
  getProductUpdateCounters(){
    return this.semWebsiteService.getProductUpdateCounters();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.semWebsiteService.findOne(+id);
  }

  @Post(CONTROLLER_WEBSITE_SYNC)
  async sync(@Body() websiteDto: SemWebsiteDto) {
    return this.semWebsiteService.sync(websiteDto);
  }

  // Add other endpoints as needed
}
