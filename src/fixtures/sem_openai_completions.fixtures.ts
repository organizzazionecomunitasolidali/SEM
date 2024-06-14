import { Fixture } from './fixtures.service';
import { SemOpenaiCompletions } from '../entities/sem_openai_completions.entity';
// import {
//   HTML_ELEMENT_TYPE_UNKNOWN,
//   HTML_ELEMENT_TYPE_PRODUCT,
//   HTML_ELEMENT_TYPE_CATEGORY,
//   HTML_ELEMENT_TYPE_PAGINATION,
// } from '../utils/globals';
const {
  HTML_ELEMENT_TYPE_UNKNOWN,
  HTML_ELEMENT_TYPE_PRODUCT,
  HTML_ELEMENT_TYPE_CATEGORY,
  HTML_ELEMENT_TYPE_PAGINATION,
} = require('../../client/src/utils/globals');

export const SemOpenaiCompletionsFixtures: Fixture = {
  entityType: SemOpenaiCompletions,
  data: [
    {
      id: 1,
      function_name: 'getProductStructure',
      website_id: null,
      group_id: null,
      body: '{"model": "gpt-4o","messages": [{"role": "system", "content": "You are an HTML parser."}, {"role": "user", "content": "Parse a product/service item of an ecommerce page and identify the elements for item details url, thumbnail, title, description, price (which cannot end with a dot or a comma; if it does , you should interpret the dot or comma as decimal separators , since a price can be a float number) and related currency. An item may have one or two prices; if they are two , each of them is in a different currency, the second one being a complementary currency; report both prices in that case. In your response , return a JSON object, without any other text, with the following structure: { url: string; thumbnail: string; title: string; description: string; price_01: number; currency_01: string; price_02: number; currency_02: string; }. Set each field with the CSS selector to extract the identified element or null if not available. There may be multiple CSS selectors that match a product in general. Give me only the one that matches more products than the others. Ignore links , images or buttons that are meant to add the item to the cart , purse , wishlists , or socials. Make the price selectors exclude explicitly the prices inside cart related HTML items , if they exist. The HTML code is the following: <html_element>"}]}',
      htmlElementStructures: null, //[0, 2],
      // parameters:
      //   '{"<html_element>": "<div class="card card--tile"><a class="cardimg-container" href="/product/6526c501614fae0002a33100"><img class="medium" width="280" height="280" src="https://pagineazzurre2.s3.eu-west-3.amazonaws.com/i286260064340696833._szw1280h1280_.jpg" alt="VAL Memoryonline Ricorda i tuoi Cari Torino  " loading="lazy"></a><div class="cardtext"><div class="row center">Servizio</div><div class="card-body"><a href="/product/6526c501614fae0002a33100"><h2 class="cardproduct-name">VAL Memoryonline Ricorda i tuoi Cari Torino  </h2></a><div class="carddetails"><div class="cardproduct-seller"><a href="/product/6526c501614fae0002a33100">GIANNI</a></div><div class="rating"><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span class="ratingcount">0 reviews</span></div><div class="card__price-container"><div class="price euro">€ 8&nbsp; e</div><div class="price">&nbsp;&nbsp;☯ 2</div></div></div></div></div></div>"}',
    },
    {
      id: 2,
      function_name: 'getHtmlElementType',
      website_id: null,
      group_id: null,
      body: `{"model": "gpt-3.5-turbo","messages": [{"role": "system", "content": "You are an HTML parser."}, {"role": "user", "content": "Parse the following HTML code of an ecommerce page and identify if the element is a product (${HTML_ELEMENT_TYPE_PRODUCT}), a category (${HTML_ELEMENT_TYPE_CATEGORY}), a pagination (${HTML_ELEMENT_TYPE_PAGINATION}) and return the corresponding number, without any other text. If you are not sure enough it matches one of those 3 possibilities, return (${HTML_ELEMENT_TYPE_UNKNOWN}). HTML: <html_element>"}]}`,
      htmlElementStructures: null, //[1],
      // parameters:
      //   '{"<html_element>": "<div class="card card--tile"><a class="cardimg-container" href="/product/6526c501614fae0002a33100"><img class="medium" width="280" height="280" src="https://pagineazzurre2.s3.eu-west-3.amazonaws.com/i286260064340696833._szw1280h1280_.jpg" alt="VAL Memoryonline Ricorda i tuoi Cari Torino  " loading="lazy"></a><div class="cardtext"><div class="row center">Servizio</div><div class="card-body"><a href="/product/6526c501614fae0002a33100"><h2 class="cardproduct-name">VAL Memoryonline Ricorda i tuoi Cari Torino  </h2></a><div class="carddetails"><div class="cardproduct-seller"><a href="/product/6526c501614fae0002a33100">GIANNI</a></div><div class="rating"><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span class="ratingcount">0 reviews</span></div><div class="card__price-container"><div class="price euro">€ 8&nbsp; e</div><div class="price">&nbsp;&nbsp;☯ 2</div></div></div></div></div></div>"}',
    },
    {
      id: 3,
      function_name: 'getProductCategory',
      website_id: null,
      group_id: null,
      body: `{"model": "gpt-3.5-turbo","messages": [{"role": "system", "content": "You are a customer of an ecommerce website."}, {"role": "user", "content": "Given the following categories (Food, Transportation, Electronics, Education, Clothing, Healthcare, Tools, Sports, Arts, Security), return one of them as a string (or null if you can't match), without any other text, for the following product description: <product_description>"}]}`,
      htmlElementStructures: null, //[1],
      // parameters:
      //   '{"<html_element>": "<div class="card card--tile"><a class="cardimg-container" href="/product/6526c501614fae0002a33100"><img class="medium" width="280" height="280" src="https://pagineazzurre2.s3.eu-west-3.amazonaws.com/i286260064340696833._szw1280h1280_.jpg" alt="VAL Memoryonline Ricorda i tuoi Cari Torino  " loading="lazy"></a><div class="cardtext"><div class="row center">Servizio</div><div class="card-body"><a href="/product/6526c501614fae0002a33100"><h2 class="cardproduct-name">VAL Memoryonline Ricorda i tuoi Cari Torino  </h2></a><div class="carddetails"><div class="cardproduct-seller"><a href="/product/6526c501614fae0002a33100">GIANNI</a></div><div class="rating"><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span class="ratingcount">0 reviews</span></div><div class="card__price-container"><div class="price euro">€ 8&nbsp; e</div><div class="price">&nbsp;&nbsp;☯ 2</div></div></div></div></div></div>"}',
    },
    {
      id: 4,
      function_name: 'getPaginationData',
      website_id: null,
      group_id: null,
      body: '{"model": "gpt-4o","messages": [{"role": "system", "content": "You are an HTML parser."}, {"role": "user", "content": "Parse a pagination item of an ecommerce page and identify the current page number, the total number of pages, and the url of the next page (null if the current one is the last). Return a JSON object, without any other text, with the following structure: { current_page: number; total_pages: number; next_page_url: string; }. The HTML code is the following: <html_element>"}]}',
      htmlElementStructures: null, //[0, 2],
      // parameters:
      //   '{"<html_element>": "<div class="card card--tile"><a class="cardimg-container" href="/product/6526c501614fae0002a33100"><img class="medium" width="280" height="280" src="https://pagineazzurre2.s3.eu-west-3.amazonaws.com/i286260064340696833._szw1280h1280_.jpg" alt="VAL Memoryonline Ricorda i tuoi Cari Torino  " loading="lazy"></a><div class="cardtext"><div class="row center">Servizio</div><div class="card-body"><a href="/product/6526c501614fae0002a33100"><h2 class="cardproduct-name">VAL Memoryonline Ricorda i tuoi Cari Torino  </h2></a><div class="carddetails"><div class="cardproduct-seller"><a href="/product/6526c501614fae0002a33100">GIANNI</a></div><div class="rating"><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span class="ratingcount">0 reviews</span></div><div class="card__price-container"><div class="price euro">€ 8&nbsp; e</div><div class="price">&nbsp;&nbsp;☯ 2</div></div></div></div></div></div>"}',
    },
  ],
  relations: ['htmlElementStructures'],
};
