import { Injectable, Logger } from '@nestjs/common';
import { SemHtmlElement } from '../entities/sem_html_element.entity';
import { SemHtmlElementService } from '../entities/sem_html_element.service';
import { SemOpenaiCompletions } from '../entities/sem_openai_completions.entity';
import { SemOpenaiCompletionsService } from '../entities/sem_openai_completions.service';
import { SemOpenaiCompletionsRequestService } from '../entities/sem_openai_completions_request.service';
// import { SemWebsiteService } from '../entities/sem_website.service';
import { SemHtmlElementStructure } from '../entities/sem_html_element_structure.entity';
import { SemHtmlElementStructureService } from '../entities/sem_html_element_structure.service';
// https://platform.openai.com/docs/guides/gpt/chat-completions-api?lang=node.js
import { ClientOptions, OpenAI } from 'openai';
import {
  hashString,
  HTML_ELEMENT_TYPE_UNKNOWN,
  // HTML_ELEMENT_TYPE_PRODUCT,
  // HTML_ELEMENT_TYPE_CATEGORY,
  // HTML_ELEMENT_TYPE_PAGINATION,
} from '../utils/globals';

const clientOptions: ClientOptions = {
  // organization: 'sem', //"org-w9hB1JYytvgitGSx9pzTsfP8",
  apiKey: process.env.OPENAI_API_KEY,
};
const openai = new OpenAI(clientOptions);

@Injectable()
export class ServiceOpenaiService {
  private readonly logger = new Logger(ServiceOpenaiService.name);

  constructor(
    private readonly semHtmlElementService: SemHtmlElementService,
    private readonly semOpenaiCompletionsService: SemOpenaiCompletionsService,
    private readonly semOpenaiCompletionsRequestService: SemOpenaiCompletionsRequestService,
    // private readonly semWebsiteService: SemWebsiteService,
    private readonly semHtmlElementStructureService: SemHtmlElementStructureService,
  ) {}

  async getFunctions() {
    try {
      const fucntions =
        this.semOpenaiCompletionsService.findDistinctFunctionNames();

      return fucntions;
    } catch (error) {
      this.logger.error(`Failed to get openai service functions`, error.stack);
      throw new Error(`Failed to get openai service functions`);
    }
  }

  // Check if it's pagination, product, category, ecc.. used to create a SemHtmlElementStructure record
  async getHtmlElementType(
    htmlElementId: number,
    htmlElement?: SemHtmlElement,
  ): Promise<number> {
    try {
      if (htmlElement === undefined || htmlElement.website === undefined) {
        htmlElement = await this.semHtmlElementService.findOne(htmlElementId);
      }

      const completions =
        await this.semOpenaiCompletionsService.findNarrowestOneBy(
          'getHtmlElementType',
          htmlElement.website,
          htmlElement.group_id,
        );

      if (htmlElement.content == '') {
        return HTML_ELEMENT_TYPE_UNKNOWN;
      }
      const parseHtmlElementResponse = await this.parseHtmlElement(
        htmlElement,
        completions,
      );
      if (isNaN(Number(parseHtmlElementResponse))) {
        return HTML_ELEMENT_TYPE_UNKNOWN;
      }

      return Number(parseHtmlElementResponse);
    } catch (error) {
      this.logger.error(
        `Failed to identify type for HTML element id: ${htmlElement.id}`,
        error.stack,
      );
      throw new Error(
        `Failed to identify type for HTML element id: ${htmlElement.id}`,
      );
    }
  }

  async getProductStructure(
    htmlElementId: number,
    htmlElement?: SemHtmlElement,
  ): Promise<SemHtmlElementStructure> {
    try {
      if (htmlElement === undefined) {
        htmlElement = await this.semHtmlElementService.findOne(htmlElementId);
      }

      // const website = await this.semWebsiteService.findOne(
      //   htmlElement.website_id,
      // );
      const completions =
        await this.semOpenaiCompletionsService.findNarrowestOneBy(
          'getProductStructure',
          htmlElement.website, // TODO use relations
          htmlElement.group_id,
        );
      if (completions === undefined) {
        throw new Error(
          `Completions not found for getProductStructure website_id ${
            0 //htmlElement.website_id, // TODO use relations
          } group_id ${htmlElement.group_id}`,
        );
      }
      let productJSON: SemHtmlElementStructure;
      productJSON = await this.semHtmlElementStructureService.findOneBy(
        completions.id,
        htmlElement.website,
        htmlElement.group_id,
      );
      if (productJSON) {
        return productJSON;
      }
      // for (const completion of completions) {
      //   const parseCompletionsParametersJSON = JSON.parse(
      //     completion.parameters,
      //   );
      //   const htmlElement = parseCompletionsParametersJSON['<html_element>'];
      //   if (htmlElement === htmlElement.content) {
      //     // Already parsed
      //     const productJSON =
      //       await this.semProductJSONService.findByCompletionsId(completion.id);
      //     if (productJSON === undefined) {
      //       throw new Error(
      //         `SemProductJSON not found for openai_completions_id ${completion.id}`,
      //       );
      //     }
      //     return productJSON;
      //   }
      // }

      const parseHtmlElementResponse = await this.parseHtmlElement(
        htmlElement,
        completions,
      );
      const parseHtmlElementResponseJSON = JSON.parse(parseHtmlElementResponse); // Checks if it is a valid JSON
      productJSON =
        await this.semHtmlElementStructureService.createHtmlElementStructure(
          // completions.id,
          0, //htmlElement.website_id, // TODO use relations
          htmlElement.group_id,
          1,
          parseHtmlElementResponse,
          completions,
        );
      console.log(
        'ServiceOpenaiService.getProductJSON() productJSON: ',
        productJSON,
      );

      return productJSON;
    } catch (error) {
      this.logger.error(
        `Failed to get product JSON for HTML element id: ${htmlElement.id}`,
        error.stack,
      );
      throw new Error(
        `Failed to get product JSON for HTML element id: ${htmlElement.id}`,
      );
    }
  }

  async parseHtmlElement(
    htmlElement: SemHtmlElement,
    completions: SemOpenaiCompletions,
    // completionsId: number,
  ): Promise<string> {
    try {
      // const completions =
      //   await this.semOpenaiCompletionsService.findOne(completionsId);
      // console.log(
      //   'ServiceOpenaiService.parseHtmlElement() completions: ',
      //   completions,
      // );
      const completionsJSON = JSON.parse(completions.body);
      console.log(
        'ServiceOpenaiService.parseHtmlElement() completionsJSON: ',
        completionsJSON,
      );
      const completionsMessageIndex = completionsJSON.messages.findIndex(
        (item) => item.role === 'user',
      );
      if (completionsMessageIndex !== -1) {
        completionsJSON.messages[completionsMessageIndex].content =
          completionsJSON.messages[completionsMessageIndex].content.replace(
            '<html_element>',
            htmlElement.content,
          );
        console.log('Updated completionsJSON: ', completionsJSON);
      }

      const body = {
        messages: completionsJSON.messages,
        // messages: [
        //   { role: 'system', content: 'You are a helpful assistant.' },
        //   { role: 'user', content: 'Tell me the result of 2 x 2' },
        // ],
        model: completionsJSON.model, //"gpt-3.5-turbo",
      };
      const bodyString = JSON.stringify(body);
      const bodyHash = hashString(bodyString);
      const semOpenaiCompletionsRequest =
        await this.semOpenaiCompletionsRequestService.findOneBy(
          htmlElement.website,
          bodyHash,
          completions,
        );
      if (semOpenaiCompletionsRequest !== null) {
        console.log(
          `OpenaiCompletionsRequest fetched from cache with hash ${bodyHash} for website id ${htmlElement.website.id} and completions id ${completions.id}`,
        );
        return semOpenaiCompletionsRequest.response;
      }

      // The system message helps set the behavior of the assistant
      const completionsResponse = await openai.chat.completions.create(body);
      console.log('parseHtmlElement() completion: ', completionsResponse);
      const response: string = completionsResponse.choices[0].message.content;
      console.log('parseHtmlElement() response: ', response);
      await this.semOpenaiCompletionsRequestService.createOpenaiCompletionsRequest(
        htmlElement.website,
        response,
        completions,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to parse HTML element: ${htmlElement}`,
        error.stack,
      );
      throw new Error(`Failed to parse HTML element: ${htmlElement}`);
    }
  }
}
