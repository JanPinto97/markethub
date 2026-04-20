import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MarketService {
  private apiUrl = `${environment.apiUrl}/markets`;

  constructor(private http: HttpClient) {}

  // Obtener precios para el Ticker superior
  getPrices(symbols: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/prices?symbols=${symbols}`);
  }

  // Obtener serie temporal para el gráfico (TradingView style)
  getHistory(symbol: string, interval: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/history?symbol=${symbol}&interval=${interval}`);
  }

  // Obtener noticias de impacto
  getNews(symbol: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/news?symbol=${symbol}`);
  }
}
