import { Fixture } from './fixtures.service';
import { SemHtmlElement } from '../entities/sem_html_element.entity';

export const SemHtmlElementFixtures: Fixture = {
  entityType: SemHtmlElement,
  data: [
    {
      id: 0,
      website: 0,
      group_id: 0,
      selector:
        'body > div > div.grid-container > main > div > div > div.row.center.cards-container > div.card.card--tile',
      content:
        '<div class="card card--tile"><a class="cardimg-container" href="/product/6526c501614fae0002a33100"><img class="medium" width="280" height="280" src="https://pagineazzurre2.s3.eu-west-3.amazonaws.com/i286260064340696833._szw1280h1280_.jpg" alt="VAL Memoryonline Ricorda i tuoi Cari Torino  " loading="lazy"></a><div class="cardtext"><div class="row center">Servizio</div><div class="card-body"><a href="/product/6526c501614fae0002a33100"><h2 class="cardproduct-name">VAL Memoryonline Ricorda i tuoi Cari Torino  </h2></a><div class="carddetails"><div class="cardproduct-seller"><a href="/product/6526c501614fae0002a33100">GIANNI</a></div><div class="rating"><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span class="ratingcount">0 reviews</span></div><div class="card__price-container"><div class="price euro">€ 8&nbsp; e</div><div class="price">&nbsp;&nbsp;☯ 2</div></div></div></div></div></div>',
    },
    {
      id: 1,
      website: 0,
      group_id: 0,
      selector:
        'body > div > div.grid-container > main > div > div > div.row.center.cards-container > div.card.card--tile',
      content:
        '<div class="card card--tile"><a class="cardimg-container" href="/product/6526c501614fae0002a33100"><img class="medium" width="280" height="280" src="https://pagineazzurre2.s3.eu-west-3.amazonaws.com/i286260064340696833._szw1280h1280_.jpg" alt="VAL Memoryonline Ricorda i tuoi Cari Torino 2 " loading="lazy"></a><div class="cardtext"><div class="row center">Servizio</div><div class="card-body"><a href="/product/6526c501614fae0002a33100"><h2 class="cardproduct-name">VAL Memoryonline Ricorda i tuoi Cari Torino 2 </h2></a><div class="carddetails"><div class="cardproduct-seller"><a href="/product/6526c501614fae0002a33100">GIANNI</a></div><div class="rating"><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span class="ratingcount">0 reviews</span></div><div class="card__price-container"><div class="price euro">€ 4&nbsp; e</div><div class="price">&nbsp;&nbsp;☯ 1</div></div></div></div></div></div>',
    },
    /*{
      id: 2,
      website: 1,
      group_id: 0,
      selector:
        'body > div > div.grid-container > main > div > div > div.row.center.cards-container > div.card.card--tile',
      content:
        '<div class="card card--tile"><a class="cardimg-container" href="/product/6526c501614fae0002a33100"><img class="medium" width="280" height="280" src="https://pagineazzurre2.s3.eu-west-3.amazonaws.com/i286260064340696833._szw1280h1280_.jpg" alt="VAL Memoryonline Ricorda i tuoi Cari Torino  " loading="lazy"></a><div class="cardtext"><div class="row center">Servizio</div><div class="card-body"><a href="/product/6526c501614fae0002a33100"><h2 class="cardproduct-name">VAL Memoryonline Ricorda i tuoi Cari Torino  </h2></a><div class="carddetails"><div class="cardproduct-seller"><a href="/product/6526c501614fae0002a33100">GIANNI</a></div><div class="rating"><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span class="ratingcount">0 reviews</span></div><div class="card__price-container"><div class="price euro">€ 8&nbsp; e</div><div class="price">&nbsp;&nbsp;☯ 2</div></div></div></div></div></div>',
    },
         {
      id: 3,
      website: 2,
      group_id: 0,
      selector:
        'body > div > div.grid-container > main > div > div > div.row.center.cards-container > div.card.card--tile',
      content:
        '<div class="card card--tile"><a class="cardimg-container" href="/product/6526c501614fae0002a33100"><img class="medium" width="280" height="280" src="https://pagineazzurre2.s3.eu-west-3.amazonaws.com/i286260064340696833._szw1280h1280_.jpg" alt="VAL Memoryonline Ricorda i tuoi Cari Torino 2 " loading="lazy"></a><div class="cardtext"><div class="row center">Servizio</div><div class="card-body"><a href="/product/6526c501614fae0002a33100"><h2 class="cardproduct-name">VAL Memoryonline Ricorda i tuoi Cari Torino 2 </h2></a><div class="carddetails"><div class="cardproduct-seller"><a href="/product/6526c501614fae0002a33100">GIANNI</a></div><div class="rating"><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span><i class="fa fa-star-o"></i></span><span class="ratingcount">0 reviews</span></div><div class="card__price-container"><div class="price euro">€ 4&nbsp; e</div><div class="price">&nbsp;&nbsp;☯ 1</div></div></div></div></div></div>',
    }, */
  ],
  relations: ['website'],
};
