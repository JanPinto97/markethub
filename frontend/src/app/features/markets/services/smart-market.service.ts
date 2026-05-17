import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, of, Subject, BehaviorSubject, forkJoin } from 'rxjs';
import { switchMap, catchError, shareReplay, takeUntil, map, tap } from 'rxjs/operators';

export interface ActiveAsset {
  symbol: string;
  apiSymbol: string;
  displaySymbol: string;
  source: string;
  coingeckoId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SmartMarketService implements OnDestroy {
  // API Keys consolidadas
  private readonly FINNHUB_KEY = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';
  private readonly TWELVEDATA_KEYS = [
    'b21b5589fbce4aada1a45a82a7bbbbf0', 
    '894fcb51c6274447ae25f43bcfce5683', 
    '344cbf1c7d404b52acf8cd66db092454'
  ];
  private currentTwelveDataKeyIndex = 0;
  private readonly COINGECKO_KEY = 'CG-T7BjzNAbWJhwFMvvbj4sM8Mp';

  private getNextTwelveDataKey(): string {
    const key = this.TWELVEDATA_KEYS[this.currentTwelveDataKeyIndex];
    this.currentTwelveDataKeyIndex = (this.currentTwelveDataKeyIndex + 1) % this.TWELVEDATA_KEYS.length;
    return key;
  }

  // Configuración de entornos Free Tier (Tiempos de seguridad anti-429)
  private readonly REFRESH_FOREX_BATCH = 45000; // 45 segundos para el Ticker lateral masivo
  private readonly REFRESH_CRYPTO = 30000;      // 30 segundos para Criptoactivos
  private readonly REFRESH_STOCKS_REST = 20000;  // 20 segundos para el activo en pantalla si falla WS

  private destroy$ = new Subject<void>();
  private ws!: WebSocket;
  private wsPrice$ = new BehaviorSubject<any>(null);

  // Cachés de Observables para Reutilización (Patrón Singleton de Streams)
  private masterForex$?: Observable<any>;
  private masterCrypto$?: Observable<any>;
  private masterStocks$?: Observable<any>;

  // Estado global reactivo para la Watchlist <-> Header (Hidratado desde LocalStorage)
  private selectedAssetSubj = new BehaviorSubject<ActiveAsset>(
    (() => {
      try {
        const saved = localStorage.getItem('markethub_active_asset');
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        return null;
      }
    })() || {
      symbol: 'BINANCE:BTCUSD',
      apiSymbol: 'BTC/USD',
      displaySymbol: 'BTC / USD',
      source: 'coingecko',
      coingeckoId: 'bitcoin'
    }
  );
  public selectedAsset$ = this.selectedAssetSubj.asObservable();

  constructor(private http: HttpClient) {}

  // Actualiza o inicializa el estado global del activo seleccionado
  public setActiveAsset(asset: ActiveAsset) {
    this.selectedAssetSubj.next(asset);
    try {
      localStorage.setItem('markethub_active_asset', JSON.stringify(asset));
    } catch (e) {}
  }

  // Helper para persistencia (Hydration)
  public updateCache(symbol: string, price: number, dp: number) {
    try {
      const cache = JSON.parse(localStorage.getItem('market_cache') || '{}');
      cache[symbol] = { c: price, dp: dp, t: Date.now() };
      localStorage.setItem('market_cache', JSON.stringify(cache));
    } catch (e) {}
  }

  public getCachedPrice(symbol: string): any {
    try {
      const cache = JSON.parse(localStorage.getItem('market_cache') || '{}');
      return cache[symbol] || { c: 0, dp: 0 };
    } catch (e) {
      return { c: 0, dp: 0 };
    }
  }

  /**
   * 1. ACCIONES E ÍNDICES - WebSocket en tiempo real (Finnhub)
   */
  initFinnhubWebSocket(symbol: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: this.currentWsSymbol }));
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol: symbol }));
      this.currentWsSymbol = symbol;
      return;
    }
    
    this.currentWsSymbol = symbol;
    this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.FINNHUB_KEY}`);

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol: symbol }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'trade') {
        this.wsPrice$.next(data.data[0]);
      }
    };

    this.ws.onerror = (err) => console.error('WebSocket Error:', err);
  }

  private currentWsSymbol = '';

  getWebSocketPriceStream(): Observable<any> {
    return this.wsPrice$.asObservable();
  }

  unsubscribeSymbol(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: symbol }));
    }
  }

  /**
   * 2. FOREX Y METALES - Master Stream Compartido (TwelveData)
   * Limitado estrictamente a 5 activos para respetar el Free Tier Limit (Max 8)
   */
  getForexPricesBatch(symbols: string[]): Observable<any> {
    if (!this.masterForex$) {
      const masterSet = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'XAG/USD'];
      const symbolsString = masterSet.join(',');

      this.masterForex$ = timer(0, this.REFRESH_FOREX_BATCH).pipe(
        switchMap(() => {
          // Rotación de API Key en cada petición para sortear el límite de 8 req/min
          const url = `https://api.twelvedata.com/quote?symbol=${symbolsString}&apikey=${this.getNextTwelveDataKey()}`;
          return this.http.get(url);
        }),
        catchError(error => {
          console.error('Error en Master Forex Stream:', error);
          return of(null);
        }),
        tap((data: any) => {
          if (data && data.status !== 'error') {
            Object.values(data).forEach((q: any) => {
               if (q && q.symbol && q.close) {
                 this.updateCache(q.symbol, parseFloat(q.close), parseFloat(q.percent_change || 0));
               }
            });
          }
        }),
        shareReplay(1),
        takeUntil(this.destroy$)
      );
    }
    return this.masterForex$;
  }

  /**
   * 3. ACCIONES E ÍNDICES - Master Stream Compartido (Finnhub)
   * Agrupa las peticiones individuales en un lote asíncrono para la Watchlist
   */
  getStocksPricesBatch(): Observable<any> {
    if (!this.masterStocks$) {
      const masterSet = ['SPY', 'QQQ', 'DIA', 'AAPL', 'TSLA', 'NFLX', 'USO'];
      
      // Llamada espaciada cada 30s. 7 calls/30s = 14 req/min (Bien por debajo de las 60 req/min de Finnhub)
      this.masterStocks$ = timer(0, 30000).pipe(
        switchMap(() => {
          const observables = masterSet.map(symbol => 
            this.http.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.FINNHUB_KEY}`).pipe(
              map((res: any) => ({ symbol, ...res })),
              catchError(() => of({ symbol, c: 0, dp: 0 }))
            )
          );
          return forkJoin(observables);
        }),
        map((results: any[]) => {
          const dict: any = {};
          results.forEach(res => {
            // Manejo sintético de USO para igualar el WTI del gráfico
            let price = res.c || 0;
            if (res.symbol === 'USO' && price > 0) price = price * 0.7146;
            
            dict[res.symbol] = {
              close: price,
              percent_change: res.dp || 0
            };
          });
          return dict;
        }),
        tap((dict: any) => {
          Object.keys(dict).forEach(sym => {
            this.updateCache(sym, dict[sym].close, dict[sym].percent_change);
          });
        }),
        shareReplay(1),
        takeUntil(this.destroy$)
      );
    }
    return this.masterStocks$;
  }

  /**
   * 3. CRIPTOMONEDAS - Master Stream Compartido
   */
  getCryptoPrices(cryptoIds: string[]): Observable<any> {
    if (!this.masterCrypto$) {
      const masterSet = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'dogecoin', 'polkadot'];
      const ids = masterSet.join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${this.COINGECKO_KEY}`;

      this.masterCrypto$ = timer(0, this.REFRESH_CRYPTO).pipe(
        switchMap(() => this.http.get(url)),
        catchError(error => {
          console.error('Error en Master Crypto Stream:', error);
          return of(null);
        }),
        tap((data: any) => {
          if (data) {
            Object.keys(data).forEach(id => {
              this.updateCache(id, data[id].usd, data[id].usd_24h_change);
            });
          }
        }),
        shareReplay(1),
        takeUntil(this.destroy$)
      );
    }
    return this.masterCrypto$;
  }

  /**
   * REST Finnhub (Stocks)
   */
  getStockPrice(symbol: string): Observable<any> {
    // Para stocks individuales en el Overview (AAPL, TSLA, etc.)
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.FINNHUB_KEY}`;

    return timer(0, this.REFRESH_STOCKS_REST).pipe(
      switchMap(() => this.http.get(url)),
      catchError(() => of(null)),
      takeUntil(this.destroy$)
    );
  }

  ngOnDestroy() {
    if (this.ws) { this.ws.close(); }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
