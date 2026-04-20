import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MarketService {
  private apiUrl = `${environment.apiUrl}/markets`;

  constructor(private http: HttpClient) {}

  // 1. Calendario Económico (vía Proxy)
  getEconomicCalendar(from: string, to: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/calendar?from=${from}&to=${to}`);
  }

  // 2. Noticias con Impacto (vía Proxy)
  getMarketNews(category: string = 'general'): Observable<any> {
    return this.http.get(`${this.apiUrl}/news?category=${category}`);
  }

  // 3. Sentimiento Global (Fear & Greed Index - API directa gratuita)
  getGlobalSentiment(): Observable<any> {
    return this.http.get('https://api.alternative.me/fng/');
  }

  // 4. Precios Real-time (vía Proxy)
  getSymbolPrice(symbol: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/prices?symbols=${symbol}`);
  }
}
