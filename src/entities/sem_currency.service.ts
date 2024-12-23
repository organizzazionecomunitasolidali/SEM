import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SemCurrency } from '../entities/sem_currency.entity';

@Injectable()
export class SemCurrencyService {
  constructor(
    @InjectRepository(SemCurrency)
    private readonly semCurrencyRepository: Repository<SemCurrency>,
  ) {}

  findAll(): Promise<SemCurrency[]> {
    return this.semCurrencyRepository.find();
  }

  async findOne(id: number): Promise<SemCurrency> {
    return this.semCurrencyRepository.findOne({
      where: { id },
    });
  }

  async findOneBySymbol(symbol: string): Promise<SemCurrency> {
    return this.semCurrencyRepository.findOne({
      where: {
        symbol: symbol,
      },
    });
  }

  async findOneByTicker(ticker: string): Promise<SemCurrency> {
    return this.semCurrencyRepository.findOne({
      where: {
        ticker: ticker,
      },
    });
  }

  async findOneByName(name: string): Promise<SemCurrency> {
    return this.semCurrencyRepository.findOne({
      where: {
        name: name,
      },
    });
  }

  async findOneByNameAndTicker(name: string, ticker: string): Promise<SemCurrency> {
    return this.semCurrencyRepository.findOne({
      where: {
        name: name,
        ticker: ticker
      },
    });
  }

  async getCurrencyFromString(currencyString: string, forceTicker: boolean = false): Promise<SemCurrency> {
    let name: string;
    let ticker: string;
    let symbol: string;
    let currency: SemCurrency;

    currencyString = currencyString.replace(/\s\s+/g, ' ');

    // fix bug with some websites: the extracted name includes the amount too
    if (currencyString.indexOf(' ') > 0) {
      let nameAndAmount: string[] = currencyString.split(' ');
      let reg = /^\d+$/;
      currencyString = reg.test(nameAndAmount[0].substring(0, 1))
        ? nameAndAmount[1]
        : nameAndAmount[0];
    }

    if(forceTicker){
      ticker = currencyString;
      currency = await this.findOneByTicker(currencyString);
    } else {
      switch (currencyString.length) {
        case 1:
          symbol = currencyString;
          currency = await this.findOneBySymbol(symbol);
          break;
        case 3:
          ticker = currencyString;
          currency = await this.findOneByTicker(ticker);
          break;
        default:
          name = currencyString;
          currency = await this.findOneByName(name);
          break;
      }
    }

    if (!currency) {
      currency = await this.createCurrency(name, ticker, symbol);
    }

    return currency;
  }

  async createCurrency(
    name: string,
    ticker: string,
    symbol: string,
    ignoreDuplicateError = false
  ): Promise<SemCurrency> {
    const currency = new SemCurrency();
    currency.name = name;
    currency.ticker = ticker;
    currency.symbol = symbol;
    try {
      return await this.save(currency);
    } catch(error){
      if(ignoreDuplicateError){
        if(error.message.indexOf("UNIQUE constraint failed") >= 0){
          let existingCurrency: SemCurrency;
          if(name){
            existingCurrency = await this.findOneByName(name);
          }  
          if(ticker && !existingCurrency){
            existingCurrency = await this.findOneByTicker(ticker);
          }  
          if(symbol && !existingCurrency){
            existingCurrency = await this.findOneBySymbol(symbol);
          }
          return existingCurrency;
        }
      }
      throw error;
    }
  }

  async save(currency: SemCurrency){
    return await this.semCurrencyRepository.save(currency);
  }
  
}
