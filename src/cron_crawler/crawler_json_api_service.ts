import { Injectable, HttpException } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

@Injectable()
export class CrawlerJsonApiService {
  private axiosInstance: AxiosInstance;
  private apiKeyHeaderName: string;
  private apiKey?: string;
  private apiSecret?: string;
  private bearerToken?: string;

  constructor(apiKeyHeaderName?: string, apiKey?: string, apiSecret?: string, bearerToken?: string) {
    this.apiKeyHeaderName = apiKeyHeaderName;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.bearerToken = bearerToken;
    this.axiosInstance = axios.create({
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }
  
  private async generateBearerToken(endpoint: string, tokenField: string) {
    try {
      const headers: Record<string, string> = {
        [this.apiKeyHeaderName || 'X-API-Key']: this.apiKey
      };

      if (this.apiSecret) {
        headers['X-API-Secret'] = this.apiSecret;
      }

      const response = await this.axiosInstance.post(endpoint, {}, { headers });
      
      if (response.data?.[tokenField]) {
        this.bearerToken = response.data[tokenField];
      }
      
      throw new Error('No token received from authentication endpoint');
      
    } catch (error) {
      this.handleError(error);
    }
    
  }

  private createConfig(): AxiosRequestConfig {
    const config: AxiosRequestConfig = {};
    
    if (this.apiKey) {
      let apiKeyHeaderName = this.apiKeyHeaderName || 'X-API-Key';
      config.headers = {
        ...config.headers,
        apiKeyHeaderName: this.apiKey
      };
    }

    if (this.bearerToken) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${this.bearerToken}`
      };
    }

    return config;
  }

  private handleError(error: any) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      switch (status) {
        case 400:
          throw new HttpException('Bad Request: ' + message, 400);
        case 401:
          throw new HttpException('Unauthorized: ' + message, 401);
        case 403:
          throw new HttpException('Forbidden: ' + message, 403);
        case 404:
          throw new HttpException('Not Found: ' + message, 404);
        case 429:
          throw new HttpException('Too Many Requests: ' + message, 429);
        case 500:
          throw new HttpException('Internal Server Error: ' + message, 500);
        default:
          throw new HttpException('API Error: ' + message, status);
      }
    }
    throw error;
  }

  async get<T>(url: string, apiKey?: string, bearerToken?: string): Promise<T> {
    try {
      const config = this.createConfig();
      const response = await this.axiosInstance.get<T>(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async post<T>(url: string, data: any, apiKey?: string, bearerToken?: string): Promise<T> {
    try {
      const config = this.createConfig();
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async put<T>(url: string, data: any, apiKey?: string, bearerToken?: string): Promise<T> {
    try {
      const config = this.createConfig();
      const response = await this.axiosInstance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async patch<T>(url: string, data: any, apiKey?: string, bearerToken?: string): Promise<T> {
    try {
      const config = this.createConfig();
      const response = await this.axiosInstance.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete<T>(url: string, apiKey?: string, bearerToken?: string): Promise<T> {
    try {
      const config = this.createConfig();
      const response = await this.axiosInstance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

