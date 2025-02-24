import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as puppeteer from 'puppeteer';
import * as robotsParser from 'robots-txt-parser';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as appRoot from 'app-root-path';
import { SemCurrency } from '../entities/sem_currency.entity';
import { SemCurrencyService } from '../entities/sem_currency.service';
import { SemCategoryService } from '../entities/sem_category.service';
import {
  SemProcessService,
  // SemProcessStatus,
} from '../entities/sem_process.service';
import { SemWebsite } from '../entities/sem_website.entity';
import { SemHtmlElementService } from '../entities/sem_html_element.service';
import { SemWebsiteService } from '../entities/sem_website.service';
import {
  ServiceOpenaiService,
  ProductHtmlElementStructure,
  PaginationHtmlElementData,
} from '../service_openai/service_openai.service';
import { SemHtmlElementStructureService } from '../entities/sem_html_element_structure.service';
import { DinastycoinCrawlerService } from './dinastycoin_crawler.service';
import {
  SemProductService,
  ProductStructure,
} from '../entities/sem_product.service';
import {
  // HTML_ELEMENT_TYPE_PAGINATION,
  // HTML_ELEMENT_TYPE_PRODUCT,
  // HTML_ELEMENT_TYPE_CATEGORY,
  // HTML_ELEMENT_TYPE_PAGINATION,
  entitiesMatch,
  removeTrailingSlash,
  delay,
  getFormattedUrl,
  getClientPublicDir,
  getClientDir,
} from '../utils/globals';
import { Connection } from 'typeorm';
const {
  // HTML_ELEMENT_TYPE_UNKNOWN,
  HTML_ELEMENT_TYPE_PRODUCT,
  // HTML_ELEMENT_TYPE_CATEGORY,
  HTML_ELEMENT_TYPE_PAGINATION,
  PROCESS_STATUS_RUNNING,
  PROCESS_STATUS_PAUSED,
  PROCESS_STATUS_STOPPED,
  // PROCESS_STATUS_ERROR,
  WEBSITE_STATUS_RUNNING,
  WEBSITE_STATUS_PAUSED,
  WEBSITE_STATUS_STOPPED,
  // WEBSITE_STATUS_ERROR,
} = require('../../client/src/utils/globals');

interface TagStructure {
  tag: string;
  classes?: string[];
  children?: TagStructure[];
  html: string;
  groupId?: number;
  selector: string;
}

declare global {
  interface Window {
    // ⚠️ notice that "Window" is capitalized here
    hello: any;
  }
}

@Injectable()
export class CronCrawlerService {
  private readonly logger = new Logger(CronCrawlerService.name);
  private robotsAgent = robotsParser({
    userAgent: 'SEMCrawler', // The name of your crawler
    allowOnNeutral: false, // If true, will allow access to undefined paths
  });

  constructor(
    private readonly semProcessService: SemProcessService,
    private readonly semHtmlElementService: SemHtmlElementService,
    private readonly semWebsiteService: SemWebsiteService,
    private readonly semHtmlElementStructureService: SemHtmlElementStructureService,
    private readonly serviceOpenaiService: ServiceOpenaiService,
    private readonly semProductService: SemProductService,
    private readonly semCurrencyService: SemCurrencyService,
    private readonly semCategoryService: SemCategoryService,
    private readonly dinastycoinCrawlerService: DinastycoinCrawlerService,
    @Inject('MEMORY_DATABASE_CONNECTION')
    private readonly memoryDbConnection: Connection,
  ) {}

  @Cron(CronExpression.EVERY_HOUR) // Runs every hour
  async handleCron() {
    // const isDebug = process.env.NODE_DEBUG === 'true';
    let timestampMs;
    let intervalMs;
    let processId;
    let hasProcessRunning = false;

    // Setup memory db connection table , for blocking requests from the frontend while the crawler is running.
    // We block such requests by checking if a certain flag in the memory db is set.
    await this.memoryDbConnection.query(
      'CREATE TABLE IF NOT EXISTS crawler_lock(is_locked INT NOT NULL PRIMARY KEY)',
    );

    this.logger.debug('Starting crawler job');

    try {

      // set the flag to block requests by frontend
      await this.memoryDbConnection.query(
        'INSERT OR IGNORE INTO crawler_lock (is_locked) VALUES (1)',
      );

      const processArray = await this.semProcessService.findAll();

      for (const processLazy of processArray) {
        processId = processLazy.id;
        timestampMs = Date.now();

        // Reload process if it has changed from first findAll
        let process = await this.semProcessService.findOne(processId);
        // Skip if it has been stopped or is already running
        if(process.status & PROCESS_STATUS_RUNNING){
          // temporary patch BEGIN
          /* We have this issue https://github.com/organizzazionecomunitasolidali/SEM/issues/5
            In short: a process sometimes crashes with status left to Running.
            We temporarily ignore if the status is running , when the last_start is beyond a certain
            time span limit , say 2 hours ago , assuming the previous execution crashed.
          */
          if(process.last_start == 0 || process.last_start < timestampMs - 2 * 3600 * 1000){
            await this.semProcessService.updateProcessField(
              process.id,
              'status',
              PROCESS_STATUS_PAUSED, // Setting PAUSED bit only
            );
          }
          // temporary patch END
          hasProcessRunning = true;
          continue;
        } else if (
          process.status & PROCESS_STATUS_STOPPED) {
          continue;
        }

        intervalMs = process.interval * 60 * 60 * 1000;

        if (process.last_start > 0) {
          // Not first run
          if (timestampMs - process.last_start < intervalMs) {
            // Interval between processes has not yet passed
            continue;
          }
          /*
          if (process.last_start > process.last_end) {
            // Previous process still running
            continue;
          }
          */
        }

        process = await this.semProcessService.updateProcessField(
          process.id,
          'status',
          PROCESS_STATUS_RUNNING, // Setting RUNNING bit only
          //process.status | PROCESS_STATUS_RUNNING, // Setting RUNNING bit
        );

        process = await this.semProcessService.updateProcessField(
          process.id,
          'last_start',
          timestampMs,
        );

        this.logger.debug('process id:', process.id);

        // We do not take the sites in a specific order, but randomly , to make the site appear more live and dynamic.
        let websitesToProcess = []
        let websiteIndexes = [];
        let stoppedWebsiteIndexes = [];
        for (let i = 0; stoppedWebsiteIndexes.length + websiteIndexes.length < process.websites.length ; i++) {
          let randomIndex = Math.floor(Math.random() * process.websites.length);
          let website = process.websites[randomIndex];
          this.logger.debug('randomIndex = ' + randomIndex + ' for website ' + website.url);
          if(website.status & WEBSITE_STATUS_STOPPED){
            if(!stoppedWebsiteIndexes.includes(randomIndex)){
              stoppedWebsiteIndexes.push(randomIndex);
            }
            this.logger.debug('website ' + website.url + ' is stopped, skipping it');
            continue;
          }
          if(!websiteIndexes.includes(randomIndex)) {
            this.logger.debug('website ' + website.url + ' is not stopped, including it');
            websiteIndexes.push(randomIndex);
            websitesToProcess.push(website);
          }
        }

        for (const websiteLazy of websitesToProcess) {
          // Reload website if it has changed from first findAll
          let website = await this.semWebsiteService.findOne(websiteLazy.id);

          this.logger.debug('crawling website url:', website.url);

          // temporary patch BEGIN
          /* We have this issue https://github.com/organizzazionecomunitasolidali/SEM/issues/5
            In short: a process/website sometimes crashes with status left to Running.
            We temporarily ignore if the status is running , when the last_start is beyond a certain
            time span limit , say 3 hours ago , assuming the previous execution crashed.
          */
          if ( website.status & WEBSITE_STATUS_RUNNING ) {
            if(website.last_start == 0 || website.last_start < timestampMs - 3 * 3600 * 1000){
              await this.semWebsiteService.updateWebsiteField(
                website.id,
                'status',
                WEBSITE_STATUS_PAUSED, // Setting PAUSED bit only
              );
            }
          }
          // temporary patch END

          if (
            website.status & WEBSITE_STATUS_STOPPED ||
            website.status & WEBSITE_STATUS_RUNNING
          ) {
            // Skip if it has been stopped or is already running
            continue;
          }

          website = await this.semWebsiteService.updateWebsiteField(
            website.id,
            'status',
            WEBSITE_STATUS_RUNNING, // Setting RUNNING bit only
            //website.status | WEBSITE_STATUS_RUNNING, // Setting RUNNING bit
          );

          timestampMs = Date.now();
          website = await this.semWebsiteService.updateWebsiteField(
            website.id,
            'last_start',
            timestampMs,
          );

          website = await this.semWebsiteService.updateWebsiteField(
            website.id,
            'message',
            '',
          );

          if(website.api_alias) {
            if(website.api_alias.toLocaleLowerCase() === 'dinastycoin') {
              await this.dinastycoinCrawlerService.crawl(website);
            }
            // TODO add other api_alias crawlers here
          } else {
            await this.crawl(website);
          }
          
          website = await this.semWebsiteService.updateWebsiteField(
            website.id,
            'status',
            WEBSITE_STATUS_PAUSED, // Setting PAUSED bit only
            //website.status | WEBSITE_STATUS_PAUSED, // Setting PAUSED bit
          );

          if(website.api_alias) {
            continue;
          }

          // Soft delete products that no longer exist
          await this.semProductService.deleteOlderThan(timestampMs, website, true);
        }

        timestampMs = Date.now();
        process = await this.semProcessService.updateProcessField(
          process.id,
          'last_end',
          timestampMs,
        );

        process = await this.semProcessService.updateProcessField(
          process.id,
          'status',
          PROCESS_STATUS_PAUSED, // Setting PAUSED bit only
          //process.status & ~PROCESS_STATUS_RUNNING, // Clearing RUNNING bit
        );
      }

      this.logger.debug('Crawler job completed successfully');
    } catch (error) {
      this.logger.error('Error running crawler job', error.stack);

      const process = await this.semProcessService.findOne(processId);
      await this.semProcessService.updateProcessField(
        process.id,
        'message',
        error.stack,
      );
    } finally {
      if(!hasProcessRunning) {
        await this.memoryDbConnection.query('DELETE FROM crawler_lock');
      }
    }
  }

  async shouldCrawl(url: string): Promise<boolean> {
    const robotsUrl = new URL('/robots.txt', url).href;
    try {
      await this.robotsAgent.useRobotsFor(robotsUrl);
      return this.robotsAgent.canCrawl(url);
    } catch (e) {
      console.error('Ignoring robots.txt. Not found? Exception: ', e);
    }
    return true;
  }

  async getCrawlDelay(url: string): Promise<number> {
    // if (process.env.NODE_ENV === 'test') {
    //   return 5;
    // }

    // TODO check if crawDelay already extracted and don't fetch again
    const robotsUrl = new URL('/robots.txt', url).href;
    try {
      await this.robotsAgent.useRobotsFor(robotsUrl);
      return this.robotsAgent.getCrawlDelay();
    } catch (e) {
      console.error('Ignoring robots.txt. Not found? Exception: ', e);
    }
    return 0;
  }

  async scrollToBottom(page: puppeteer.Page) {
    try {
      let lastHeight = await page.evaluate('document.body.scrollHeight');
      let scrollCounter = 0;
      while (scrollCounter++ <= 100) {
        for (let i = 1; i <= 20; i++) {
          await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
          await page.waitForTimeout(2000); // sleep a bit
          await page.evaluate(
            'window.scrollTo(0, document.body.scrollHeight-200)',
          );
          await page.waitForTimeout(100); // sleep a bit
        }
        let newHeight = await page.evaluate('document.body.scrollHeight');
        if (newHeight === lastHeight) {
          return;
        }
        lastHeight = newHeight;
        console.log('in scrollToBottom newHeight = ' + newHeight);
        // limit scroll for now
        if (parseInt(lastHeight.toString()) > 600000) {
          break;
        }
      }
    } catch (error) {
      console.error(`Failed scrollToBottom: `, error);
    }
  }

  async crawl(websiteLazy: SemWebsite) {
    // const isDebug = process.env.NODE_DEBUG === 'true';
    // const isDebug = process.execArgv.some(
    //   (arg) => arg.includes('--inspect') || arg.includes('--debug'),
    // );
    // console.log('isDebug: ', isDebug);
    // if (!isDebug) {
    //   return;
    // }

    const url = removeTrailingSlash(websiteLazy.url);

    const canCrawl = await this.shouldCrawl(url);
    if (!canCrawl) {
      console.warn(`Crawling is disallowed by robots.txt: ${url}`);
      return;
    }
    const crawlDelay = await this.getCrawlDelay(url);

    let pageUrl = url;
    let currentPage = 1;
    // let pages = [];
    let total_pages = 0;
    let websiteId;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    try {
      while (pageUrl) {
        websiteId = websiteLazy.id;

        const website = await this.semWebsiteService.findOne(websiteId);
        if (
          website.status & WEBSITE_STATUS_STOPPED ||
          website.status & WEBSITE_STATUS_PAUSED
        ) {
          // Stop crawling if website processing has been stopped or paused
          break;
        }

        // Deal with pagination
        const page = await browser.newPage();
        await page.goto(pageUrl, { waitUntil: 'networkidle0' });
        // await page.goto(url, { waitUntil: 'domcontentloaded' });
        // await page.waitForSelector('your-dynamic-content-selector');
        await page.waitForTimeout(1000); // Additional time buffer, if necessary

        let html = await page.content();
        let $ = cheerio.load(html);

        // Function to recursively traverse the DOM and record the tag structure with classes, HTML, and selector
        const getTagStructure = (
          element: cheerio.Element,
          parentSelector?: string,
        ): TagStructure => {
          const tag = element.tagName;
          const classes = $(element).attr('class')
            ? $(element).attr('class').split(/\s+/)
            : [];
          const classSelector = classes.length ? '.' + classes.join('.') : '';
          let currentSelector = `${
            parentSelector ? parentSelector + ' > ' : ''
          }${tag}${classSelector}`;
          currentSelector = currentSelector.replace('. ', '');

          const structure: TagStructure = {
            tag,
            html: $(element).html() || '',
            selector: currentSelector,
          };

          if (classes.length) {
            structure.classes = classes;
          }

          // If the element has children, recurse
          const children = $(element).children().toArray();
          if (children.length > 0) {
            structure.children = children.map((child) =>
              getTagStructure(child, currentSelector),
            );
          }

          return structure;
        };

        // Function to check if two TagStructure objects are equal
        const areStructuresEqual = (
          a: TagStructure,
          b: TagStructure,
        ): boolean => {
          // Check if tags and classes are the same
          if (
            a.tag !== b.tag ||
            (a.classes || []).join(' ') !== (b.classes || []).join(' ')
          ) {
            return false;
          }

          // Check if children arrays are the same length
          if ((a.children || []).length !== (b.children || []).length) {
            return false;
          }

          // Recursively check all children
          for (let i = 0; i < (a.children || []).length; i++) {
            if (!areStructuresEqual(a.children![i], b.children![i])) {
              return false;
            }
          }

          return true;
        };

        // Function to remove duplicate structures
        const removeDuplicates = (
          structures: TagStructure[],
        ): TagStructure[] => {
          return structures.reduce<TagStructure[]>((unique, current) => {
            if (!unique.some((item) => areStructuresEqual(item, current))) {
              unique.push(current);
            }
            return unique;
          }, []);
        };

        let globalGroupId = 0; // Counter for unique groupId

        await this.semHtmlElementService.deleteHtmlElementsByWebsite(website);

        // Function to recursively deduplicate all structures and assign unique groupId
        const deduplicateStructure = async (
          page: puppeteer.Page,
          structure: TagStructure,
          website: SemWebsite,
        ): Promise<TagStructure> => {
          // Assign a unique groupId to the current structure if it doesn't have one
          if (structure.groupId === undefined) {
            structure.groupId = ++globalGroupId;
          }

          // Create a record for the current structure
          await this.semHtmlElementService.createHtmlElement(
            structure.groupId,
            structure.selector,
            structure.html,
            website,
          );

          // If the structure has children, process them recursively
          if (structure.children) {
            // First, remove duplicates from the children
            const uniqueChildren = removeDuplicates(structure.children);

            // Then, process each unique child asynchronously and wait for all to complete
            structure.children = await Promise.all(
              uniqueChildren.map((child) =>
                deduplicateStructure(page, child, website),
              ),
            );
          }

          return structure;
        };

        // Start from the body element
        const bodyStructure = getTagStructure($('body')[0]);

        // Deduplicate the body structure
        const deduplicatedBodyStructure = await deduplicateStructure(
          page,
          bodyStructure,
          website,
        );

        if (process.env.NODE_ENV === 'test' && pageUrl === url) {
          // Convert your data to a string format, typically JSON for complex data
          const groupsDataString = JSON.stringify(
            deduplicatedBodyStructure,
            null,
            2,
          );

          const urlObj = new URL(url);
          const baseUrl = `${urlObj.hostname}`;
          const logsSubfolder = 'logs';
          const logFilename = baseUrl + '.output.json';

          // Check if the subfolder exists; if not, create it
          const subfolderPath = path.join(appRoot.path, logsSubfolder);
          if (!fs.existsSync(subfolderPath)) {
            fs.mkdirSync(subfolderPath, { recursive: true });
          }

          // Define the full path for the file
          const filePath = path.join(subfolderPath, logFilename);

          // Write the string to a file
          fs.writeFileSync(filePath, groupsDataString);
        }

        // if (!isDebug) {
        //   return;
        // }

        // htmlElements sorted by group_id in descending order, from innermost to outermost
        const updatedWebsite = await this.semWebsiteService.findOne(
          website.id,
          ['process', 'htmlElements'],
        );
        const updatedHtmlElements = updatedWebsite.htmlElements.sort(
          (a, b) => b.group_id - a.group_id,
        );

        let productHtmlElementStructure = null;
        let paginationHtmlElementStructure = null;
        let paginationHtmlElementData: string = '';

        productHtmlElementStructure =
          await this.semHtmlElementStructureService.findOneByWebsiteAndType(
            website,
            HTML_ELEMENT_TYPE_PRODUCT,
          );

        paginationHtmlElementStructure =
          await this.semHtmlElementStructureService.findOneByWebsiteAndType(
            website,
            HTML_ELEMENT_TYPE_PAGINATION,
          );

        // if (productHtmlElementStructure === null) {
        for (const updatedHtmlElement of updatedHtmlElements) {
          if (updatedHtmlElement.selector === 'body') {
            continue; // No need to parse whole body, only subsections
          }

          if (
            productHtmlElementStructure !== null &&
            paginationHtmlElementStructure !== null
          ) {
            // Product and pagination structures have already been identified, no need to call serviceOpenaiService.getHtmlElementType
            if (paginationHtmlElementStructure) {
              if (
                updatedHtmlElement.selector ===
                paginationHtmlElementStructure.selector
              ) {
                paginationHtmlElementData =
                  await this.serviceOpenaiService.getPaginationData(
                    updatedHtmlElement.id,
                    updatedHtmlElement,
                  );
                break;
              } else if (paginationHtmlElementStructure.json) {
                // infinite scrolling?
                const json = JSON.parse(paginationHtmlElementStructure.json);
                if (json.is_infinite_scrolling) {
                  break;
                }
              }
            }

            continue;
          }

          // if (
          //   isDebug &&
          //   updatedHtmlElement.selector ===
          //     'body > div > div.grid-container > main > div > div > div.row.center.cards-container > div.card.card--tile'
          // ) {
          //   debugger;
          // }

          // console.log('htmlElement.group_id: ', updatedHtmlElement.group_id);

          const htmlElementType =
            await this.serviceOpenaiService.getHtmlElementType(
              updatedHtmlElement.id,
              updatedHtmlElement,
            );
          if (
            htmlElementType === HTML_ELEMENT_TYPE_PRODUCT &&
            productHtmlElementStructure === null
          ) {
            console.log(
              'Product htmlElement.group_id: ',
              updatedHtmlElement.group_id,
            );

            productHtmlElementStructure =
              await this.serviceOpenaiService.getProductStructure(
                updatedHtmlElement.id,
                updatedHtmlElement,
              );
          } else if (htmlElementType === HTML_ELEMENT_TYPE_PAGINATION) {
            console.log(
              'Pagination htmlElement.group_id: ',
              updatedHtmlElement.group_id,
            );

            // if (paginationHtmlElementStructure === null) {
            paginationHtmlElementData =
              await this.serviceOpenaiService.getPaginationData(
                updatedHtmlElement.id,
                updatedHtmlElement,
              );
            // }
          }

          if (
            productHtmlElementStructure !== null &&
            productHtmlElementStructure !== undefined &&
            // paginationHtmlElementStructure !== null &&
            // paginationHtmlElementStructure !== undefined &&
            paginationHtmlElementData !== '' &&
            paginationHtmlElementData !== null
          ) {
            break;
          }
        }
        // }

        const productHtmlElementStructureJSON: ProductHtmlElementStructure =
          JSON.parse(productHtmlElementStructure.json);
        let productStructure: ProductStructure;

        const extractFromElement = (
          $,
          element,
          selector: string,
          attr?: string,
        ): string => {
          try {
            if (selector) {
              const selectedElement = $(element).find(selector);
              return attr ? selectedElement.attr(attr) : selectedElement.text();
            }
          } catch (error) {
            console.error(`Failed extractFromElement: ${selector}`, error);
          }
        };

        const extractNumbers = (str) => {
          if (!str) {
            return 0;
          }
          let sanitizedStr = str.replace(/null/g, '0').trim();
          let tagPosition = sanitizedStr.indexOf('<');
          if (tagPosition > 0) {
            sanitizedStr = sanitizedStr.substring(0, tagPosition).trim();
          }
          // detect if it is has a decimal part with comma and replace it with dot
          if (sanitizedStr.match(/\d+,\d{1,2}/)) {
            sanitizedStr = sanitizedStr.replace(',', '.');
          }
          // if still with comma, it may be thousands separator. remove it. Otherwise Number will return NaN
          sanitizedStr = sanitizedStr.replace(',', '');
          // now parse the number
          const matches = sanitizedStr.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
          return matches.map(Number);
        };

        const isValidSelector = ($, selector) => {
          try {
            $(selector);
            return true;
          } catch (e) {
            return false;
          }
        };

        const getCurrency = async (
          $,
          productElement,
          currencyString: string,
        ): Promise<SemCurrency> => {
          let currencyStringTemp: string;

          if (!currencyString) {
            return null;
          }

          if (isValidSelector($, currencyString)) {
            currencyStringTemp = extractFromElement(
              $,
              productElement,
              currencyString,
            );
          }
          if (!currencyStringTemp) {
            currencyStringTemp = currencyString;
          }
          // This will remove trailing spaces and colons
          currencyStringTemp = currencyStringTemp.replace(/[:\s]+$/, '');
          if (!currencyStringTemp) {
            return null;
          }

          const currency: SemCurrency =
            await this.semCurrencyService.getCurrencyFromString(
              currencyStringTemp,
            );

          return currency;
        };

        // if infinite scroll , scroll down as many times as possible.
        // in the meantime , allow the frontend to query the products , so unlock the db
        await this.memoryDbConnection.query('DELETE FROM crawler_lock');
        console.log(
          'before scrollToBottom. once finished , you should see another log here...',
        );
        await this.scrollToBottom(page);
        await this.memoryDbConnection.query(
          'INSERT OR IGNORE INTO crawler_lock (is_locked) VALUES (1)',
        );
        console.log(
          'scrollToBottom finished. Re-downloading the whole HTML from the page.',
        );
        // infinite scrolling finished , continue the crawling.
        console.log('Downloading html of page ' + page.url());
        if(!paginationHtmlElementStructure.json || !JSON.parse(paginationHtmlElementStructure.json).is_infinite_scrolling){
          await this.takeScreenshot(page, website, currentPage);
        }
        // now reload the whole html to get all products at once, if the site had infinite scroll
        html = await page.content();
        console.log('Downloaded html of page ' + page.url());
        $ = cheerio.load(html);
        console.log('cheerio.load done');

        let productElements = $(productHtmlElementStructure.selector).get();
        if (productElements.length == 0) {
          productElements = $(website.default_product_selector).get();
        }
        let numbers = [];

        // Loop through product elements to insert/update them
        // $(productHtmlElementStructure.selector).each((index, element) => {
        for (const productElement of productElements) {
          // 'element' refers to the current item in the loop
          // You can use $(element) to wrap it with Cheerio and use jQuery-like methods

          productStructure = {
            url: null,
            thumbnailUrl: null,
            title: null,
            description: null,
            description_long: null,
            price_01: null,
            currency_01_id: null,
            price_02: null,
            currency_02_id: null,
            category_id: null,
            is_used: false,
            timestamp: null,
          };

          productStructure.url =
            // removeTrailingSlash(website.url) +
            extractFromElement(
              $,
              productElement,
              productHtmlElementStructureJSON.url,
              'href',
            );
          productStructure.url = getFormattedUrl(
            website.url,
            productStructure.url,
          );

          productStructure.thumbnailUrl = extractFromElement(
            $,
            productElement,
            productHtmlElementStructureJSON.thumbnail,
            'src',
          );
          productStructure.thumbnailUrl = getFormattedUrl(
            website.url,
            productStructure.thumbnailUrl,
          );

          console.log(
            'productStructure.thumbnailUrl =  ' + productStructure.thumbnailUrl,
          );

          productStructure.title = extractFromElement(
            $,
            productElement,
            productHtmlElementStructureJSON.title,
          );

          productStructure.description = extractFromElement(
            $,
            productElement,
            productHtmlElementStructureJSON.description,
          );

          console.log('productStructure.title =  ' + productStructure.title);

          // if (
          //   productStructure.thumbnailUrl &&
          //   productStructure.thumbnailUrl.startsWith('/') &&
          //   !productStructure.thumbnailUrl.startsWith(
          //     removeTrailingSlash(website.url),
          //   )
          // ) {
          //   // If it's an url and it's relative, not absolute
          //   productStructure.thumbnailUrl =
          //     removeTrailingSlash(website.url) + productStructure.thumbnailUrl;
          // }

          numbers = [];
          numbers = extractNumbers(
            extractFromElement(
              $,
              productElement,
              productHtmlElementStructureJSON.price_01,
            ),
          );
          productStructure.price_01 =
            numbers && numbers.length > 0 ? numbers[0] : 0;

          console.log(
            'productStructure.price_01 =  ' + productStructure.price_01,
          );

          numbers = [];
          numbers = extractNumbers(
            extractFromElement(
              $,
              productElement,
              productHtmlElementStructureJSON.price_02,
            ),
          );
          productStructure.price_02 =
            numbers.length > 1
              ? numbers[1]
              : productStructure.price_01 === 0
                ? numbers[0]
                : 0;

          console.log(
            'productStructure.price_02 =  ' + productStructure.price_02,
          );

          if (!productStructure.price_01 && !productStructure.price_02) {
            continue;
          }

          const currency_01 = await getCurrency(
            $,
            productElement,
            productHtmlElementStructureJSON.currency_01,
          );
          productStructure.currency_01_id = currency_01.id;

          console.log(
            'productStructure.currency_01_id =  ' +
              productStructure.currency_01_id,
          );

          const currency_02 = await getCurrency(
            $,
            productElement,
            productHtmlElementStructureJSON.currency_02,
          );
          productStructure.currency_02_id = currency_02 ? currency_02.id : null;

          console.log(
            'productStructure.currency_02_id =  ' +
              productStructure.currency_02_id,
          );

          if (
            (productStructure.price_01 && !productStructure.currency_01_id) ||
            (productStructure.price_02 && !productStructure.currency_02_id)
          ) {
            console.log('at least a price has no currency. skip');
            continue;
          }

          // if only one of the two prices is set , make it the first
          if (!productStructure.currency_01_id) {
            productStructure.currency_01_id = productStructure.currency_02_id;
            productStructure.price_01 = productStructure.price_02;
            productStructure.currency_02_id = null;
            productStructure.price_02 = null;
          }

          const categoryName =
            await this.serviceOpenaiService.getProductCategory(
              productStructure.title,
              website,
            );
          console.log('categoryName = ' + categoryName);
          const category =
            await this.semCategoryService.findOneByName(categoryName);
          productStructure.category_id = category ? category.id : null;

          productStructure.timestamp = Date.now();

          let productAlreadyExist: boolean = false;

          console.log('findOneByUrl  ' + productStructure.url);

          // Url must be unique
          let product = await this.semProductService.findOneByUrl(
            productStructure.url,
          );
          if (product) {
            console.log('entitiesMatch ' + productStructure.url);
            if (
              entitiesMatch(product, productStructure, {
                exclude: ['id', 'timestamp', 'is_used'],
              })
            ) {
              // Product already existing in database
              console.log(
                'updateProductTimestamp ' + productStructure.timestamp,
              );
              productAlreadyExist = true;
              product = await this.semProductService.updateProductTimestamp(
                product,
                productStructure.timestamp,
              );
              // update thumbnail if it has changed
              console.log(
                'updateProductThumbnail ' + product.url + ' ' + productStructure.thumbnailUrl,
              );
              if(true || product.thumbnail_url != productStructure.thumbnailUrl){
                await this.semProductService.updateProductThumbnail(product, productStructure.thumbnailUrl, true);
              }
            } else {
              // Delete previous product with same url
              await this.semProductService.delete(product.id);
            }
          }
          if (!productAlreadyExist && productStructure.currency_01_id) {
            if(!productStructure.is_used){
              // there is a possibility the information about the used status is not in the 
              // element on the product list , but only in the full product page (example CoseInutili website).
              // in that case: search in the HTML any hints about it
              let html = await this.semProductService.downloadText(productStructure.url);
              if(html){
                let usedWordInManyLanguages = {
                  "en" : "Used",
                  "es": "Usado",
                  "pt": "Usado",
                  "de": "Gebraucht",
                  "it" : "Usato",
                  "fr": "Utilisé",
                  "da" : "Brugt",
                  "sv" : "Begagnad",
                  "no" : "Brukt",
                  "fi" : "Käytetty",
                  "is" : "Notaður",
                  "et" : "Kasutatud",
                  "lv" : "Lietots",
                  "lt" : "Naudotas",
                  "fo" : "Nýttur",
                  "kl" : "Atorneqarpoq",
                  "nl" : "Gebruikt"
                }
                for (let key in usedWordInManyLanguages) {
                  if(html.indexOf(">" + usedWordInManyLanguages[key]) > 0){
                    productStructure.is_used = true;
                    break;
                  }
                }
              }
            }
            console.log('createProduct');
            await this.semProductService.createProduct(
              productStructure,
              website,
            );
          }
        }

        if (!paginationHtmlElementData) {
          // if no pagination , infinite scroll?
          console.log('no pagination. break');
          break;
        }

        console.log('Trying to navigate to next page...');

        pageUrl = null;
        const paginationJSON: PaginationHtmlElementData = JSON.parse(
          paginationHtmlElementData,
        );
        if (paginationJSON.current_page < paginationJSON.total_pages) {
          // if (paginationHtmlElementData || pages.length > 0) {
          //   if (pages.length === 0) {
          //     pages = JSON.parse(paginationHtmlElementData);
          //   }

          // if (pages.length > 1) {
          //   if (currentPage < pages.length) {
          pageUrl = getFormattedUrl(website.url, paginationJSON.next_page_url); //pages[currentPage];
          // if (!pageUrl.startsWith(removeTrailingSlash(website.url))) {
          //   // If it's a relative url, not absolute
          //   if (!pageUrl.startsWith('/')) {
          //     pageUrl = '/' + pageUrl;
          //   }

          //   pageUrl = removeTrailingSlash(website.url) + pageUrl;
          // }
          // }
          currentPage++; // Failsafe in case of infinite loops
          // }
        }

        console.log('currentPage = ' + currentPage);

        if (total_pages === 0) {
          websiteLazy = await this.semWebsiteService.updateWebsiteField(
            websiteLazy.id,
            'num_pages',
            paginationJSON.total_pages,
          );
          total_pages = paginationJSON.total_pages;
        }
        websiteLazy = await this.semWebsiteService.updateWebsiteField(
          websiteLazy.id,
          'last_page',
          paginationJSON.current_page,
        );
        if (currentPage > total_pages) {
          console.log('currentPage > total_pages');
          break;
        }
        if (pageUrl) {
          delay(crawlDelay);
        }
        console.log('pageUrl = ' + pageUrl);
      }
      // });
    } catch (error) {
      console.log(`Failed to crawl: ${url}. ` + error.message);
      console.error(`Failed to crawl: ${url}`, error);

      // Update the existing websiteLazy object instead of reassigning it
      const website = await this.semWebsiteService.findOne(websiteId);
      if (website) {
        Object.assign(websiteLazy, website);
      }

      const message: string = error.message;
      websiteLazy = await this.semWebsiteService.updateWebsiteField(
        websiteLazy.id,
        'message',
        message,
      );
    } finally {
      await browser.close();
    }
  }


  async takeScreenshot(page: puppeteer.Page, website: SemWebsite, pageNumber: number) {
  
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(getClientDir(), 'crawler_screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Check if today is first of the month. If so , clean up the directory if there are more than 1000 files
    const today = new Date();
    if (today.getDate() === 1) {
      // Get all files in screenshots directory
      const files = fs.readdirSync(screenshotsDir);          
      // If more than 1000 files exist Delete all files
      if (files.length > 1000) {
        files.forEach(file => {
          fs.unlinkSync(path.join(screenshotsDir, file));
        });            
        // Reset index.html
        if (fs.existsSync(path.join(screenshotsDir, 'index.html'))) {
          fs.writeFileSync(path.join(screenshotsDir, 'index.html'), '');
        }
      }
    }

    // Generate filename with website id, page number and datetime
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
    const screenshotFilename = `website_${website.id}_page_${pageNumber}_${dateStr}_${timeStr}.png`;
    const screenshotPath = path.join(screenshotsDir, screenshotFilename);

    // Take screenshot
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    // Update index.html
    const indexPath = path.join(screenshotsDir, 'index.html');
    let indexHtml = '';
    
    if (fs.existsSync(indexPath)) {
      indexHtml = fs.readFileSync(indexPath, 'utf8');
    }

    // If this is first entry for today, add new date section
    if (!indexHtml.includes(`<h2>${dateStr}</h2>`)) {
      const newSection = `
        <h2>${dateStr}</h2>
        <div class="website-group" data-website="${website.id}">
          <h3>Website ID: ${website.id}</h3>
          <div class="screenshots">
            <a href="${screenshotFilename}" target="_blank">
              <img src="${screenshotFilename}" width="300" />
              <div>Page ${pageNumber} - ${timeStr}</div>
            </a>
          </div>
        </div>`;

      if (!indexHtml) {
        // First time creating index.html
        indexHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Crawler Screenshots</title>
              <style>
                .website-group { margin-bottom: 30px; }
                .screenshots { display: flex; flex-wrap: wrap; gap: 20px; }
                .screenshots a { text-decoration: none; color: #333; text-align: center; }
              </style>
            </head>
            <body>
              ${newSection}
            </body>
          </html>`;
      } else {
        // Add new section after body tag
        indexHtml = indexHtml.replace(/<body>/, `<body>${newSection}`);
      }
    } else {
      // Add screenshot to existing website group for today
      const screenshotEntry = `
        <a href="${screenshotFilename}" target="_blank">
          <img src="${screenshotFilename}" width="300" />
          <div>Page ${pageNumber} - ${timeStr}</div>
        </a>`;

      // Find today's website group and add screenshot
      const websiteGroupRegex = new RegExp(`<div class="website-group" data-website="${website.id}">([\\s\\S]*?)<\\/div>`);
      if (indexHtml.match(websiteGroupRegex)) {
        indexHtml = indexHtml.replace(websiteGroupRegex, (match, content) => {
          return match.replace('</div>', `${screenshotEntry}</div>`);
        });
      } else {
        // Add new website group for today
        const newWebsiteGroup = `
          <div class="website-group" data-website="${website.id}">
            <h3>Website ID: ${website.id}</h3>
            <div class="screenshots">
              ${screenshotEntry}
            </div>
          </div>`;
        indexHtml = indexHtml.replace(`<h2>${dateStr}</h2>`, `<h2>${dateStr}</h2>${newWebsiteGroup}`);
      }
    }

    fs.writeFileSync(indexPath, indexHtml);
  }

}
