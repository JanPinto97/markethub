import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { MarketService } from '../../core/services/market.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, timeout } from 'rxjs/operators';
import { EconomicCalendarComponent } from './economic-calendar/economic-calendar.component';
import { MarketNewsComponent } from './market-news/market-news.component';
import { ChartsComponent } from './charts/charts.component';

declare const TradingView: any;

@Component({
  selector: 'app-markets',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, CurrencyPipe, DatePipe, EconomicCalendarComponent, MarketNewsComponent, ChartsComponent],
  templateUrl: './markets.component.html',
  styleUrls: ['./markets.component.css']
})
export class MarketsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('symbolInput') symbolInput!: ElementRef;
  @ViewChild('searchContainer') searchContainer!: ElementRef;

  // CONFIGURACIÓN (API Keys)
  private apiKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';       // Finnhub
  private rapidApiKey = '1e856b26f1msh7ff07161e81308ep1bec53jsn7edd8d75b995';
  private rapidApiHost = 'yahoo-finance15.p.rapidapi.com';
  private newsDataKey = 'pub_51b0bb5e9a054ff19dbd2272f643fef5';
  private marketauxKey = 'TUzZlehn8kwZmGgBBbQW4Rmzds6ZRYLwwRdd8VO1';
  private tiingoApiKey = '07705bf17ddd89eb11ea83b95d01042a522162a9';
  private twelveDataApiKey = 'b21b5589fbce4aada1a45a82a7bbbbf0';
  private coinGeckoApiKey = 'CG-T7BjzNAbWJhwFMvvbj4sM8Mp';
  private polygonApiKey = 'OCf0bs98iWLZfq_pr2qslbGqna7uOTt4';
  private alphaVantageApiKey = 'SXTQA9LA0XWN7H64';
  private socket: WebSocket | null = null;
  
  widget: any;
  currentSymbol: string = 'CRYPTO:BTCUSD';
  displaySymbol: string = 'BTC / USD';
  currentApiSymbol: string = 'BTC/USD';
  currentSource: string = 'twelvedata';
  currentCoingeckoId: string = '';
  currentPriceData: any = { c: 0, dp: 0 };
  assetNotSupported: boolean = false;
  currentYear = new Date().getFullYear();
  selectedDate: Date = new Date();
  lastSentimentUpdate: string = '';
  private clockInterval: any;
  private refreshInterval: any;
  private searchSubject = new Subject<string>();
  
  // 1. SÍMBOLOS Y ETIQUETAS (Arquitectura Inteligente: Finnhub, TwelveData, Synthetic)
  coins: any[] = [
    { symbol: 'BTC/USD', tech: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD', source: 'twelvedata', price: 0, change: 0 },
    { symbol: 'ETH/USD', tech: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD', source: 'twelvedata', price: 0, change: 0 },
    { symbol: 'EUR/USD', tech: 'FX:EURUSD', apiSymbol: 'EUR/USD', source: 'twelvedata', price: 0, change: 0 }, 
    { symbol: 'S&P 500 (SPY)', tech: 'SPY', apiSymbol: 'SPY', source: 'finnhub', price: 0, change: 0 },       
    { symbol: 'GOLD (XAU)', tech: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD', source: 'twelvedata', price: 0, change: 0 }, 
    { symbol: 'NASDAQ 100 (QQQ)', tech: 'QQQ', apiSymbol: 'QQQ', source: 'finnhub', price: 0, change: 0 },      
    { symbol: 'AAPL', tech: 'AAPL', apiSymbol: 'AAPL', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'NVDA', tech: 'NVDA', apiSymbol: 'NVDA', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'TSLA', tech: 'TSLA', apiSymbol: 'TSLA', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'CRUDE OIL (WTI)', tech: 'TVC:USOIL', apiSymbol: 'USO', source: 'finnhub_synthetic_wti', price: 0, change: 0 }
  ];

  searchResults: any[] = [];
  showSearchModal: boolean = false;
  searchQuery: string = '';
  
  economicEvents: any[] = [];
  filteredEvents: any[] = [];
  marketNews: any[] = [];
  sentimentData: any = { value: 0, value_classification: '...' };
  activeTab: 'overview' | 'calendar' | 'news' | 'charts' = 'overview';
  /** Se pasa una sola vez a News para abrir el detalle al venir desde Overview */
  pendingNewsArticle: {
    title: string;
    snippet: string;
    time: number;
    source: string;
    category: string;
    image: string | null;
    url: string;
    isPro: boolean;
  } | null = null;
  
  @ViewChild('newsSlider') newsSlider!: ElementRef;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.showSearchModal && !this.searchContainer.nativeElement.contains(event.target)) {
      this.showSearchModal = false;
      this.cdr.detectChanges();
    }
  }

  private sourceExhausted: { [key: string]: boolean } = { 'twelvedata': false, 'polygon': false, 'tiingo': false };
  private lastExhaustedCheck: number = 0;
  private tickerPointer = 0; 

  checkPersistence() {
    try {
      const saved = localStorage.getItem('markethub_state');
      if (saved) {
        const { date, exhaustedMap, tickerPrices, lastPrice, lastCheck } = JSON.parse(saved);
          // 1. Hidratar Ticker (Escaneo profundo: busca por símbolo visual y por API)
          if (tickerPrices && this.coins) {
            this.coins.forEach(coin => {
              // Intenta recuperar por clave de símbolo o clave de API (para mayor robustez)
              const cached = tickerPrices[coin.symbol] || tickerPrices[coin.apiSymbol] || tickerPrices[coin.tech];
              if (cached && cached.price > 0) {
                coin.price = cached.price;
                coin.change = cached.change;
              }
            });
          }

          // 2. Hidratar Overview (Prioridad: Último visto -> Ticker -> Respaldo)
          const currentMatch = this.coins ? this.coins.find(c => c.apiSymbol === this.currentApiSymbol || c.tech === this.currentApiSymbol) : null;
          
          if (lastPrice && (lastPrice.symbol === this.currentApiSymbol || lastPrice.symbol === this.currentSymbol) && lastPrice.data.c > 0) {
            this.currentPriceData = lastPrice.data;
          } else if (currentMatch && currentMatch.price > 0) {
            this.currentPriceData = { c: currentMatch.price, dp: currentMatch.change };
          }

          // 3. Gestionar estados de API (Esto sí depende de la fecha)
          if (date === new Date().toDateString()) {
            this.sourceExhausted = { ...this.sourceExhausted, ...exhaustedMap };
            this.lastExhaustedCheck = lastCheck || 0;
          } else {
            this.sourceExhausted = { 'twelvedata': false, 'polygon': false, 'tiingo': false };
          }
          
          console.log("Memoria de Precios Hidratada al 100%.");
        }
      } catch (e: any) {
        console.error("Error en hidratación:", e);
      }
    }

  savePersistence() {
    try {
      const savedRaw = localStorage.getItem('markethub_state');
      const currentState = savedRaw ? JSON.parse(savedRaw) : {};
      
      // Mantenemos lo que ya había (Merge inteligente)
      const tickerPrices: any = currentState.tickerPrices || {};

      // Solo ACTUALIZAMOS si el precio es real (>0). Si es 0, mantenemos el antiguo.
      if (this.coins) {
        this.coins.forEach(c => {
          if (c.price > 0) {
            // Guardamos bajo múltiples claves para que la recuperación sea infalible ante cambios de nombre
            tickerPrices[c.symbol] = { price: c.price, change: c.change };
            tickerPrices[c.apiSymbol] = { price: c.price, change: c.change };
          }
        });
      }

      // Lo mismo para el precio de la cabecera (Overview)
      let lastPriceToSave = currentState.lastPrice;
      if (this.currentPriceData && this.currentPriceData.c > 0) {
        lastPriceToSave = { symbol: this.currentApiSymbol, data: this.currentPriceData };
      }

      localStorage.setItem('markethub_state', JSON.stringify({
        date: new Date().toDateString(),
        exhaustedMap: this.sourceExhausted,
        tickerPrices: tickerPrices,
        lastPrice: lastPriceToSave,
        lastCheck: this.lastExhaustedCheck
      }));
    } catch (e: any) {}
  }

  ngOnInit() {
    this.checkPersistence();
    this.initDashboard();
    this.setupWebSocket();
    this.startLiveClock();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.performSearch(query);
    });

    // Polling automático optimizado: Detecta agotamiento y cambia de fuente AL INSTANTE
    this.refreshInterval = setInterval(() => {
      this.syncAllPrices();
    }, 8000);
  }

  syncAllPrices() {
      const now = new Date().getTime();
      
      // Resetear estado de agotamiento al día siguiente
      const lastCheckDay = new Date(this.lastExhaustedCheck).getDate();
      const today = new Date().getDate();
      if (lastCheckDay !== today) {
        this.sourceExhausted = { 'twelvedata': false, 'polygon': false, 'tiingo': false };
        this.lastExhaustedCheck = now;
        this.savePersistence();
      }

      // 1. Gráfico Principal (Prioridad Alta)
      if (this.sourceExhausted['twelvedata'] && this.currentSource === 'twelvedata') {
        this.executePriceChain(this.currentApiSymbol);
      } else {
        this.updatePrice(this.currentApiSymbol, this.currentSource);
      }
      
      // 2. Ticker
      this.loadTickerPricesStaggered();
  }

  // Actualiza los pares de TwelveData de forma inteligente
  loadTickerPricesStaggered() {
    const tdCoins = this.coins.filter(c => c.source === 'twelvedata');
    if (tdCoins.length === 0) return;

    if (!this.sourceExhausted['twelvedata']) {
      const tdSymbols = tdCoins.map(c => c.apiSymbol).join(',');
      this.http.get(`https://api.twelvedata.com/quote?symbol=${tdSymbols}&apikey=${this.twelveDataApiKey}`)
        .subscribe({
          next: (data: any) => {
            if (!data || data.status === 'error' || data.code === 429 || data.message?.includes('limit')) {
              this.sourceExhausted['twelvedata'] = true;
              this.savePersistence();
              this.fillAllTickerFallbacks(); 
              return;
            }
            this.coins.forEach(coin => {
              if (coin.source === 'twelvedata') {
                const quote = tdSymbols.includes(',') ? data[coin.apiSymbol] : data;
                if (quote && quote.close) {
                  coin.price = parseFloat(quote.close);
                  coin.change = parseFloat(quote.percent_change || 0);
                }
              }
            });
            this.savePersistence(); // Guardar ticker de TwelveData
            this.cdr.detectChanges();
          },
          error: () => { 
            this.sourceExhausted['twelvedata'] = true; 
            this.savePersistence();
            this.fillAllTickerFallbacks();
          }
        });
    } else {
      // Si ya sabemos que está agotado, rotamos de 1 en 1 para mantener el ritmo sin saturar
      const coin = tdCoins[this.tickerPointer % tdCoins.length];
      this.tickerPointer++;
      this.fetchPriceOnlyFallback(coin.apiSymbol, (price) => {
        coin.price = price;
        this.savePersistence(); // Guardar fallback individual
        this.cdr.detectChanges();
      });
    }

    // El resto de Finnhub (Stocks) son ilimitados
    this.coins.forEach(coin => {
      if (coin.source.startsWith('finnhub')) {
        this.updateFinnhubTicker(coin);
      }
    });
  }

  // Llena TODO el ticker de golpe usando fallbacks (combinando APIs para repartir carga)
  fillAllTickerFallbacks() {
    const tdCoins = this.coins.filter(c => c.source === 'twelvedata');
    tdCoins.forEach((coin, index) => {
      // Stagger de 500ms entre llamadas para que Polygon no nos bloquee por "burst"
      setTimeout(() => {
        this.fetchPriceOnlyFallback(coin.apiSymbol, (price) => {
          coin.price = price;
          this.cdr.detectChanges();
        });
      }, index * 500);
    });
  }

  updateFinnhubTicker(coin: any) {
    this.http.get(`https://finnhub.io/api/v1/quote?symbol=${coin.apiSymbol}&token=${this.apiKey}`)
      .subscribe((data: any) => {
        if (data && data.c && data.c !== 0) {
          const multiplier = coin.source === 'finnhub_synthetic_wti' ? 0.7146 : 1;
          coin.price = data.c * multiplier;
          coin.change = data.dp || 0;
          this.savePersistence(); // Guardar ticker de Finnhub
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.close();
    }
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  openUrl(url: string) {
    if (url) window.open(url, '_blank');
  }

  startLiveClock() {
    const tick = () => {
      const now = new Date();
      this.lastSentimentUpdate = now.toLocaleString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
      this.cdr.detectChanges();
    };
    tick(); // ejecutar inmediatamente
    this.clockInterval = setInterval(tick, 1000);
  }

  setupWebSocket() {
    this.socket = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

    this.socket.addEventListener('open', () => {
      // Suscribimos a los activos del ticker inicial
      this.coins.forEach(coin => this.subscribeSymbol(coin.tech));
      // Suscribimos al símbolo actual
      this.subscribeSymbol(this.currentSymbol);
    });

    this.socket.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'trade') {
        const trades = msg.data;
        trades.forEach((trade: any) => {
          // Actualizamos el precio del ticker si coincide
          const coin = this.coins.find(c => c.tech === trade.s);
          if (coin) {
            coin.price = trade.p;
          }
          // Actualizamos el precio de la cabecera SOLO si coincide exactamente
          if (trade.s === this.currentSymbol) {
            this.currentPriceData = { ...this.currentPriceData, c: trade.p };
          }
        });
        this.savePersistence(); // Guardar cambios de WS
        this.cdr.detectChanges();
      }
    });
  }

  subscribeSymbol(symbol: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'subscribe', symbol: symbol }));
    }
  }

  unsubscribeSymbol(symbol: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'unsubscribe', symbol: symbol }));
    }
  }

  initDashboard() {
    this.selectedDate = new Date();
    this.showSearchModal = false;
    this.searchResults = [];
    this.assetNotSupported = false;
    
    this.loadNews();
    this.loadGlobalSentiment();
    this.syncAllPrices(); // Ejecución inmediata de la cadena de precios (incluye saltos de agotamiento)
    this.fetchCalendarData();
  }

  onSearchFocus() {
    if (this.searchQuery.length < 1) {
      this.showPopularAssets();
    } else {
      this.showSearchModal = true;
    }
  }

  showPopularAssets() {
    this.searchResults = this.coins.map(c => ({
      symbol: c.tech,
      apiSymbol: c.apiSymbol,
      description: c.symbol,
      type: 'POPULAR',
      source: c.source
    }));
    this.showSearchModal = true;
    this.cdr.detectChanges();
  }

  onSearchInput(query: string) {
    this.searchQuery = query;
    if (query.length < 1) {
      this.showPopularAssets();
      return;
    }
    // Solo enviamos al subject para procesar con debounce
    this.searchSubject.next(query);
  }

  private performSearch(query: string) {
    // CAPA 1: Mapa de atajos locales — resuelve INSTANTÁNEAMENTE sin API.
    // Garantiza que BTC→BTCUSD, XAU→XAUUSD, EUR→EURUSD, OIL→TVC:USOIL, etc.
    const SHORTHAND_MAP: { [key: string]: any } = {
      'XAU':     { symbol: 'OANDA:XAUUSD',  apiSymbol: 'XAU/USD',  description: 'Gold Spot / US Dollar',       type: 'METAL',     source: 'twelvedata' },
      'GOLD':    { symbol: 'OANDA:XAUUSD',  apiSymbol: 'XAU/USD',  description: 'Gold Spot / US Dollar',       type: 'METAL',     source: 'twelvedata' },
      'XAUUSD':  { symbol: 'OANDA:XAUUSD',  apiSymbol: 'XAU/USD',  description: 'Gold Spot / US Dollar',       type: 'METAL',     source: 'twelvedata' },
      'XAG':     { symbol: 'OANDA:XAGUSD',  apiSymbol: 'XAG/USD',  description: 'Silver Spot / US Dollar',     type: 'METAL',     source: 'twelvedata' },
      'SILVER':  { symbol: 'OANDA:XAGUSD',  apiSymbol: 'XAG/USD',  description: 'Silver Spot / US Dollar',     type: 'METAL',     source: 'twelvedata' },
      'XAGUSD':  { symbol: 'OANDA:XAGUSD',  apiSymbol: 'XAG/USD',  description: 'Silver Spot / US Dollar',     type: 'METAL',     source: 'twelvedata' },
      'BTC':     { symbol: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD',  description: 'Bitcoin / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'BITCOIN': { symbol: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD',  description: 'Bitcoin / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'ETH':     { symbol: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD',  description: 'Ethereum / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'ETHEREUM':{ symbol: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD',  description: 'Ethereum / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'SOL':     { symbol: 'BINANCE:SOLUSD', apiSymbol: 'SOL/USD',  description: 'Solana / US Dollar',          type: 'CRYPTO',    source: 'twelvedata' },
      'SOLANA':  { symbol: 'BINANCE:SOLUSD', apiSymbol: 'SOL/USD',  description: 'Solana / US Dollar',          type: 'CRYPTO',    source: 'twelvedata' },
      'ADA':     { symbol: 'BINANCE:ADAUSD', apiSymbol: 'ADA/USD',  description: 'Cardano / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'CARDANO': { symbol: 'BINANCE:ADAUSD', apiSymbol: 'ADA/USD',  description: 'Cardano / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'DOT':     { symbol: 'BINANCE:DOTUSD', apiSymbol: 'DOT/USD',  description: 'Polkadot / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'POLKADOT':{ symbol: 'BINANCE:DOTUSD', apiSymbol: 'DOT/USD',  description: 'Polkadot / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'AVAX':    { symbol: 'BINANCE:AVAXUSD', apiSymbol: 'AVAX/USD',  description: 'Avalanche / US Dollar',       type: 'CRYPTO',    source: 'twelvedata' },
      'AVALANCHE':{ symbol: 'BINANCE:AVAXUSD',apiSymbol: 'AVAX/USD',  description: 'Avalanche / US Dollar',       type: 'CRYPTO',    source: 'twelvedata' },
      'XRP':     { symbol: 'BINANCE:XRPUSD', apiSymbol: 'XRP/USD',  description: 'XRP / US Dollar',             type: 'CRYPTO',    source: 'twelvedata' },
      'RIPPLE':  { symbol: 'BINANCE:XRPUSD', apiSymbol: 'XRP/USD',  description: 'XRP / US Dollar',             type: 'CRYPTO',    source: 'twelvedata' },
      'LINK':    { symbol: 'BINANCE:LINKUSD', apiSymbol: 'LINK/USD', description: 'Chainlink / US Dollar',      type: 'CRYPTO',    source: 'twelvedata' },
      'CHAINLINK':{ symbol: 'BINANCE:LINKUSD',apiSymbol: 'LINK/USD', description: 'Chainlink / US Dollar',      type: 'CRYPTO',    source: 'twelvedata' },
      'MATIC':   { symbol: 'BINANCE:MATICUSD',apiSymbol: 'MATIC/USD',description: 'Polygon / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'POLYGON': { symbol: 'BINANCE:MATICUSD',apiSymbol: 'MATIC/USD',description: 'Polygon / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'DOGE':    { symbol: 'BINANCE:DOGEUSD',apiSymbol: 'DOGE/USD', description: 'Dogecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'DOGECOIN':{ symbol: 'BINANCE:DOGEUSD',apiSymbol: 'DOGE/USD', description: 'Dogecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'SHIB':    { symbol: 'BINANCE:SHIBUSD',apiSymbol: 'SHIB/USD', description: 'Shiba Inu / US Dollar',       type: 'CRYPTO',    source: 'twelvedata' },
      'LTC':     { symbol: 'BINANCE:LTCUSD', apiSymbol: 'LTC/USD',  description: 'Litecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'LITECOIN':{ symbol: 'BINANCE:LTCUSD', apiSymbol: 'LTC/USD',  description: 'Litecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'EUR':     { symbol: 'FX:EURUSD',     apiSymbol: 'EUR/USD',  description: 'Euro / US Dollar',            type: 'FOREX',     source: 'twelvedata' },
      'EURUSD':  { symbol: 'FX:EURUSD',     apiSymbol: 'EUR/USD',  description: 'Euro / US Dollar',            type: 'FOREX',     source: 'twelvedata' },
      'GBP':     { symbol: 'FX:GBPUSD',     apiSymbol: 'GBP/USD',  description: 'British Pound / US Dollar',  type: 'FOREX',     source: 'twelvedata' },
      'OIL':     { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      description: 'Crude Oil WTI',              type: 'COMMODITY', source: 'finnhub_synthetic_wti' },
      'WTI':     { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      description: 'Crude Oil WTI',              type: 'COMMODITY', source: 'finnhub_synthetic_wti' },
      'SPY':     { symbol: 'SPY',           apiSymbol: 'SPY',      description: 'S&P 500 ETF',                type: 'INDEX ETF', source: 'finnhub' },
      'SP500':   { symbol: 'SPY',           apiSymbol: 'SPY',      description: 'S&P 500 ETF',                type: 'INDEX ETF', source: 'finnhub' },
      'QQQ':     { symbol: 'QQQ',           apiSymbol: 'QQQ',      description: 'NASDAQ 100 ETF',             type: 'INDEX ETF', source: 'finnhub' },
      'NASDAQ':  { symbol: 'QQQ',           apiSymbol: 'QQQ',      description: 'NASDAQ 100 ETF',             type: 'INDEX ETF', source: 'finnhub' },
    };

    const shorthandMatch = SHORTHAND_MAP[query.trim().toUpperCase()];
    const pinnedResult = shorthandMatch ? [shorthandMatch] : [];

    // CAPA 2 & 3: Búsqueda Multi-API (Twelve Data para Stocks/Forex + CoinGecko para Cripto)
    const twelveDataObs = this.http.get(`https://api.twelvedata.com/symbol_search?symbol=${query}&outputsize=10`)
      .pipe(catchError(() => of({ data: [] })));
    
    const coinGeckoObs = this.http.get(`https://api.coingecko.com/api/v3/search?query=${query}&x_cg_demo_api_key=${this.coinGeckoApiKey}`)
      .pipe(catchError(() => of({ coins: [] })));

    forkJoin({
      tdRes: twelveDataObs,
      cgRes: coinGeckoObs
    }).subscribe(({ tdRes, cgRes }) => {
        const tdResults = (tdRes as any).data || [];
        const cgResults = (cgRes as any).coins || [];
        
        // Mapa de activos populares: sobreescribe el símbolo TV y la API para activos conocidos
        const POPULAR_ASSET_MAP: { [key: string]: { tvSymbol: string; apiSymbol: string; source: string; coingeckoId?: string } } = {
          'XAU/USD':  { tvSymbol: 'OANDA:XAUUSD',   apiSymbol: 'XAU/USD', source: 'twelvedata' },
          'XAG/USD':  { tvSymbol: 'OANDA:XAGUSD',   apiSymbol: 'XAG/USD', source: 'twelvedata' },
          'EUR/USD':  { tvSymbol: 'FX:EURUSD',       apiSymbol: 'EUR/USD', source: 'twelvedata' },
          'GBP/USD':  { tvSymbol: 'FX:GBPUSD',       apiSymbol: 'GBP/USD', source: 'twelvedata' },
          'USD/JPY':  { tvSymbol: 'FX:USDJPY',       apiSymbol: 'USD/JPY', source: 'twelvedata' },
          'AUD/USD':  { tvSymbol: 'FX:AUDUSD',       apiSymbol: 'AUD/USD', source: 'twelvedata' },
          'USD/CAD':  { tvSymbol: 'FX:USDCAD',       apiSymbol: 'USD/CAD', source: 'twelvedata' },
          'USD/CHF':  { tvSymbol: 'FX:USDCHF',       apiSymbol: 'USD/CHF', source: 'twelvedata' },
          'NZD/USD':  { tvSymbol: 'FX:NZDUSD',       apiSymbol: 'NZD/USD', source: 'twelvedata' },
          'BTC/USD':  { tvSymbol: 'CRYPTO:BTCUSD',   apiSymbol: 'BTC/USD', source: 'coingecko', coingeckoId: 'bitcoin' },
          'ETH/USD':  { tvSymbol: 'CRYPTO:ETHUSD',   apiSymbol: 'ETH/USD', source: 'coingecko', coingeckoId: 'ethereum' },
          'SOL/USD':  { tvSymbol: 'CRYPTO:SOLUSD',   apiSymbol: 'SOL/USD', source: 'coingecko', coingeckoId: 'solana' },
          'BNB/USD':  { tvSymbol: 'CRYPTO:BNBUSD',   apiSymbol: 'BNB/USD', source: 'coingecko', coingeckoId: 'binancecoin' },
          'XRP/USD':  { tvSymbol: 'CRYPTO:XRPUSD',   apiSymbol: 'XRP/USD', source: 'coingecko', coingeckoId: 'ripple' },
          'ADA/USD':  { tvSymbol: 'CRYPTO:ADAUSD',   apiSymbol: 'ADA/USD', source: 'coingecko', coingeckoId: 'cardano' },
          'DOGE/USD': { tvSymbol: 'CRYPTO:DOGEUSD',  apiSymbol: 'DOGE/USD', source: 'coingecko', coingeckoId: 'dogecoin' },
          'DOT/USD':  { tvSymbol: 'CRYPTO:DOTUSD',   apiSymbol: 'DOT/USD', source: 'coingecko', coingeckoId: 'polkadot' },
          'AVAX/USD': { tvSymbol: 'CRYPTO:AVAXUSD',  apiSymbol: 'AVAX/USD', source: 'coingecko', coingeckoId: 'avalanche-2' },
          'LINK/USD': { tvSymbol: 'CRYPTO:LINKUSD',  apiSymbol: 'LINK/USD', source: 'coingecko', coingeckoId: 'chainlink' },
          'MATIC/USD':{ tvSymbol: 'CRYPTO:MATICUSD', apiSymbol: 'MATIC/USD',source: 'coingecko', coingeckoId: 'polygon-ecosystem-token' },
          'SHIB/USD': { tvSymbol: 'CRYPTO:SHIBUSD',  apiSymbol: 'SHIB/USD', source: 'coingecko', coingeckoId: 'shiba-inu' },
          'LTC/USD':  { tvSymbol: 'CRYPTO:LTCUSD',   apiSymbol: 'LTC/USD', source: 'coingecko', coingeckoId: 'litecoin' },
          'TRX/USD':  { tvSymbol: 'CRYPTO:TRXUSD',   apiSymbol: 'TRX/USD', source: 'coingecko', coingeckoId: 'tron' },
          'UNI/USD':  { tvSymbol: 'CRYPTO:UNIUSD',   apiSymbol: 'UNI/USD', source: 'coingecko', coingeckoId: 'uniswap' },
          'ATOM/USD': { tvSymbol: 'CRYPTO:ATOMUSD',  apiSymbol: 'ATOM/USD', source: 'coingecko', coingeckoId: 'cosmos' },
          'NEAR/USD': { tvSymbol: 'CRYPTO:NEARUSD',  apiSymbol: 'NEAR/USD', source: 'coingecko', coingeckoId: 'near' },
          'XLM/USD':  { tvSymbol: 'CRYPTO:XLMUSD',   apiSymbol: 'XLM/USD', source: 'coingecko', coingeckoId: 'stellar' },
          'ICP/USD':  { tvSymbol: 'CRYPTO:ICPUSD',   apiSymbol: 'ICP/USD', source: 'coingecko', coingeckoId: 'internet-computer' },
        };

        // Procesar resultados de Twelve Data
        const apiMapped = tdResults.filter((item: any) => {
          return item.instrument_type !== 'Index' || item.symbol === 'SPX' || item.symbol === 'NDX' || item.symbol === 'IXIC';
        }).map((item: any) => {
          let tvSymbol = item.symbol;
          let apiSymbol = item.symbol;
          let type = item.instrument_type || 'ASSET';
          let source = 'twelvedata';

          if (type === 'Physical Currency') {
            const pairSymbol = item.symbol;
            const override = POPULAR_ASSET_MAP[pairSymbol];
            if (override) {
              tvSymbol = override.tvSymbol;
              apiSymbol = override.apiSymbol;
              source = override.source;
            } else {
              tvSymbol = `FX:${item.symbol.replace('/', '')}`;
              apiSymbol = item.symbol;
            }
            type = pairSymbol.includes('XAU') || pairSymbol.includes('XAG') ? 'METAL' : 'FOREX';
          } else if (type === 'Digital Currency' || type === 'Cryptocurrency') {
            const cryptoSymbol = item.symbol;
            const override = POPULAR_ASSET_MAP[cryptoSymbol];
            if (override) {
              tvSymbol = override.tvSymbol;
              apiSymbol = override.apiSymbol;
              source = override.source;
            } else {
              tvSymbol = `CRYPTO:${item.symbol.replace('/', '')}`;
              apiSymbol = item.symbol;
            }
            type = 'CRYPTO';
          } else if (type === 'Common Stock') {
            source = 'finnhub';
            type = 'STOCK';
          } else if (item.symbol === 'SPX' || item.symbol === 'NDX' || item.symbol === 'IXIC') {
             if (item.symbol === 'SPX') { tvSymbol = 'SPY'; apiSymbol = 'SPY'; source = 'finnhub'; }
             if (item.symbol === 'NDX' || item.symbol === 'IXIC') { tvSymbol = 'QQQ'; apiSymbol = 'QQQ'; source = 'finnhub'; }
             type = 'INDEX ETF';
          }

          return {
            symbol: tvSymbol,
            apiSymbol: apiSymbol,
            description: item.instrument_name,
            type: type,
            source: source
          };
        });

        // Procesar resultados de CoinGecko (Solo si no están ya en Twelve Data)
        const cgMapped = cgResults.slice(0, 5).map((item: any) => {
          const sym = item.symbol.toUpperCase();
          const apiSym = `${sym}/USD`;
          const tvSym = `BINANCE:${sym}USD`;
          
          return {
            symbol: tvSym,
            apiSymbol: apiSym,
            description: item.name,
            type: 'CRYPTO',
            source: 'coingecko',
            coingeckoId: item.id
          };
        });

        // Combinar todos los resultados
        const combined = [...apiMapped, ...cgMapped];

        // El resultado curado (pinnedResult) va PRIMERO para que Enter lo seleccione correctamente
        this.searchResults = [
          ...pinnedResult,
          ...combined.filter((r: any) => !pinnedResult.some((p: any) => p.symbol === r.symbol))
        ];

        this.showSearchModal = true;
        this.cdr.detectChanges();
      });
  }

  onEnterSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Capa 1: Mapa instantáneo local — respuesta 0ms
    const QUICK_MAP: { [key: string]: any } = {
      'XAU': { symbol: 'OANDA:XAUUSD',  apiSymbol: 'XAU/USD',  source: 'twelvedata' },
      'GOLD': { symbol: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD',  source: 'twelvedata' },
      'XAG': { symbol: 'OANDA:XAGUSD',  apiSymbol: 'XAG/USD',  source: 'twelvedata' },
      'SILVER': { symbol: 'OANDA:XAGUSD', apiSymbol: 'XAG/USD', source: 'twelvedata' },
      'BTC': { symbol: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD',  source: 'coingecko', coingeckoId: 'bitcoin' },
      'BITCOIN': { symbol: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD', source: 'coingecko', coingeckoId: 'bitcoin' },
      'ETH': { symbol: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD',  source: 'coingecko', coingeckoId: 'ethereum' },
      'SOL': { symbol: 'BINANCE:SOLUSD', apiSymbol: 'SOL/USD',  source: 'coingecko', coingeckoId: 'solana' },
      'ADA': { symbol: 'BINANCE:ADAUSD', apiSymbol: 'ADA/USD',  source: 'coingecko', coingeckoId: 'cardano' },
      'CARDANO': { symbol: 'BINANCE:ADAUSD', apiSymbol: 'ADA/USD', source: 'coingecko', coingeckoId: 'cardano' },
      'DOT': { symbol: 'BINANCE:DOTUSD', apiSymbol: 'DOT/USD',  source: 'coingecko', coingeckoId: 'polkadot' },
      'AVAX': { symbol: 'BINANCE:AVAXUSD', apiSymbol: 'AVAX/USD', source: 'coingecko', coingeckoId: 'avalanche-2' },
      'XRP': { symbol: 'BINANCE:XRPUSD', apiSymbol: 'XRP/USD',  source: 'coingecko', coingeckoId: 'ripple' },
      'EUR': { symbol: 'FX:EURUSD',     apiSymbol: 'EUR/USD',  source: 'twelvedata' },
      'EURUSD': { symbol: 'FX:EURUSD',  apiSymbol: 'EUR/USD',  source: 'twelvedata' },
      'GBP': { symbol: 'FX:GBPUSD',     apiSymbol: 'GBP/USD',  source: 'twelvedata' },
      'OIL': { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      source: 'finnhub_synthetic_wti' },
      'WTI': { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      source: 'finnhub_synthetic_wti' },
      'SPY': { symbol: 'SPY',           apiSymbol: 'SPY',      source: 'finnhub' },
      'SP500': { symbol: 'SPY',         apiSymbol: 'SPY',      source: 'finnhub' },
      'QQQ': { symbol: 'QQQ',           apiSymbol: 'QQQ',      source: 'finnhub' },
      'NASDAQ': { symbol: 'QQQ',        apiSymbol: 'QQQ',      source: 'finnhub' },
    };
    const quickMatch = QUICK_MAP[trimmed.toUpperCase()];
    if (quickMatch) {
      this.selectResult(quickMatch);
      return;
    }

    // Capa 2: Validar que el primer resultado de la API coincide con lo que escribió el usuario.
    // Si los resultados son de una búsqueda anterior (stale), NO los usamos — activamos el overlay.
    const queryUpper = trimmed.toUpperCase();
    const freshResult = this.searchResults.find((r: any) =>
      r.symbol?.toUpperCase().includes(queryUpper) ||
      r.description?.toUpperCase().includes(queryUpper)
    );

    if (freshResult) {
      this.selectResult(freshResult);
    } else {
      // No existe el activo — mostramos el overlay premium en vez del error interno de TradingView
      this.assetNotSupported = true;
      this.showSearchModal = false;
      this.searchResults = [];
      this.searchQuery = '';
      this.cdr.detectChanges();
    }
  }

  selectResult(result: any) {
    this.unsubscribeSymbol(this.currentSymbol);

    this.currentSymbol = result.symbol;
    this.currentApiSymbol = result.apiSymbol;
    this.currentSource = result.source;
    this.currentCoingeckoId = result.coingeckoId || '';
    
    // LIMPIEZA ATÓMICA: Evitar que el precio del activo anterior se quede pegado
    this.currentPriceData = { c: 0, dp: 0 };
    
    this.displaySymbol = this.formatDisplaySymbol(this.currentSymbol);
    
    this.subscribeSymbol(this.currentSymbol);

    // Optimización: Si el activo ya está en el ticker, usamos ese precio inmediatamente para evitar el $0.00
    const cachedCoin = this.coins.find(c => c.tech === this.currentSymbol || c.apiSymbol === this.currentApiSymbol);
    if (cachedCoin && cachedCoin.price > 0) {
      this.currentPriceData = { c: cachedCoin.price, dp: cachedCoin.change };
    } else {
      this.updatePrice(this.currentApiSymbol, this.currentSource);
    }

    this.loadTradingViewWidget(this.currentSymbol);
    
    this.showSearchModal = false;
    this.searchQuery = '';
    this.assetNotSupported = false;
    this.cdr.detectChanges();
  }

  loadAllData() {
    this.initDashboard();
  }

  ngAfterViewInit() {
    this.loadTradingViewWidget(this.currentSymbol);
  }

  formatDisplaySymbol(symbol: string) {
    if (symbol === 'SPY') return 'S&P 500 (SPY)';
    if (symbol === 'QQQ') return 'NASDAQ 100 (QQQ)';
    if (symbol.includes('BTC') || symbol.includes('ETH')) return symbol.replace('BINANCE:', '').replace('CRYPTO:', '').replace('USDT', ' / USD').replace('USD', ' / USD');
    if (symbol.includes('FX:EURUSD')) return 'EUR / USD';
    if (symbol.includes('XAUUSD')) return 'GOLD (XAU)';
    if (symbol.includes('USOIL')) return 'CRUDE OIL (WTI)';
    
    return symbol.split(':').pop() || symbol;
  }

  // Dinámicamente formatea los decimales: 4 decimales (pips completos) para Forex, 2 para el resto.
  getPriceFormat(techSymbol: string): string {
    if (techSymbol && (techSymbol.includes('FX:') || techSymbol.includes('EURUSD') || techSymbol.includes('OANDA:'))) {
      if (techSymbol.includes('XAUUSD')) return '1.2-2'; // El oro suele mostrar 2 decimales
      return '1.4-4';
    }
    return '1.2-2';
  }

  updatePrice(apiSymbol: string, source: string) {
    if (!apiSymbol) return;

    // Si ya sabemos que TwelveData está agotado y es nuestra fuente, saltamos directo al flujo de respaldo
    if (source === 'twelvedata' && this.sourceExhausted['twelvedata']) {
      this.executePriceChain(apiSymbol);
      return;
    }

    // Caso especial: Otros proveedores (Finnhub, Coingecko) que funcionan bien
    if (source === 'coingecko') {
      const id = this.currentCoingeckoId;
      this.http.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${this.coinGeckoApiKey}`)
        .subscribe((data: any) => {
          if (data && data[id] && apiSymbol === this.currentApiSymbol) {
            this.currentPriceData = { c: data[id].usd, dp: data[id].usd_24h_change || 0 };
            this.savePersistence();
            this.cdr.detectChanges();
          }
        });
      return;
    }

    if (source.startsWith('finnhub')) {
      this.http.get(`https://finnhub.io/api/v1/quote?symbol=${apiSymbol}&token=${this.apiKey}`)
        .subscribe((data: any) => {
          if (data && data.c && data.c !== 0 && apiSymbol === this.currentApiSymbol) {
            const multiplier = source === 'finnhub_synthetic_wti' ? 0.7146 : 1;
            let dp = data.dp;
            if (dp === 0 && data.pc !== 0) dp = ((data.c - data.pc) / data.pc) * 100;
            this.currentPriceData = { c: data.c * multiplier, dp: dp || 0, timestamp: new Date().getTime() };
            this.cdr.detectChanges();
          }
        });
      return;
    }

    // PASO 1: Intentar TwelveData (con timeout de 10s)
    this.http.get(`https://api.twelvedata.com/quote?symbol=${apiSymbol}&apikey=${this.twelveDataApiKey}`)
      .pipe(
        timeout(10000),
        catchError(() => of({ status: 'error', code: 429 }))
      )
      .subscribe((data: any) => {
        // Si el símbolo ya no coincide con lo que el usuario está viendo, abortamos para no contaminar datos
        if (apiSymbol !== this.currentApiSymbol) return;

        if (data && data.close && data.status !== 'error' && parseFloat(data.close) !== 0) {
          this.currentPriceData = {
            c: parseFloat(data.close),
            dp: parseFloat(data.percent_change || 0),
            timestamp: new Date().getTime()
          };
          this.savePersistence();
          this.cdr.detectChanges();
        } else {
          // Si falla TwelveData (o timeout), vamos al flujo de respaldo
          if (data.code === 429 || data.status === 'error' || data.message?.includes('limit')) {
            this.sourceExhausted['twelvedata'] = true;
            this.savePersistence();
          }
          this.executePriceChain(apiSymbol);
        }
      });
  }

  // FLUJO DE RESPALDO ESTRICTO: Polygon -> Tiingo -> Alpha Vantage
  executePriceChain(apiSymbol: string) {
    if (apiSymbol !== this.currentApiSymbol) return;

    const cleanSymbol = apiSymbol.replace('/', '').toUpperCase();
    const [from, to] = apiSymbol.includes('/') ? apiSymbol.split('/') : [apiSymbol, 'USD'];
    
    // PASO 2: Polygon.io (Skip si está agotado o Timeout 10s)
    if (this.sourceExhausted['polygon']) {
      this.step3Tiingo(apiSymbol, from, to, cleanSymbol);
      return;
    }

    const polygonUrl = apiSymbol.includes('/') 
      ? `https://api.polygon.io/v1/last/currencies/${from}/${to}?apiKey=${this.polygonApiKey}`
      : `https://api.polygon.io/v2/last/nbbo/${cleanSymbol}?apiKey=${this.polygonApiKey}`;

    this.http.get(polygonUrl).pipe(
      timeout(10000),
      catchError(() => of(null))
    ).subscribe((data: any) => {
      if (apiSymbol !== this.currentApiSymbol) return;

      const price = data?.last?.price || data?.results?.p;
      if (price) {
        this.currentPriceData = { ...this.currentPriceData, c: price, timestamp: new Date().getTime() };
        this.savePersistence();
        this.cdr.detectChanges();
      } else {
        if (data?.status === 'ERROR' || data?.message?.includes('limit')) {
          this.sourceExhausted['polygon'] = true;
          this.savePersistence();
        }
        if (apiSymbol === this.currentApiSymbol) {
          this.step3Tiingo(apiSymbol, from, to, cleanSymbol);
        }
      }
    });
  }

  private step3Tiingo(apiSymbol: string, from: string, to: string, cleanSymbol: string) {
    if (this.sourceExhausted['tiingo']) {
      this.step4AlphaVantage(apiSymbol, from, to);
      return;
    }

    const tiingoTicker = apiSymbol.includes('/') ? apiSymbol.replace('/', '').toLowerCase() : apiSymbol.toLowerCase();
    const tiingoUrl = apiSymbol.includes('/')
      ? `https://api.tiingo.com/tiingo/fx/${tiingoTicker}/top?token=${this.tiingoApiKey}`
      : `https://api.tiingo.com/tiingo/crypto/prices?tickers=${tiingoTicker}&token=${this.tiingoApiKey}`;

    this.http.get(tiingoUrl).pipe(
      timeout(10000),
      catchError(() => of(null))
    ).subscribe((tData: any) => {
      if (apiSymbol !== this.currentApiSymbol) return;

      const tPrice = tData && tData[0] ? (tData[0]?.midPrice || tData[0]?.lastPrice) : null;
      if (tPrice) {
        this.currentPriceData = { ...this.currentPriceData, c: tPrice, timestamp: new Date().getTime() };
        this.savePersistence();
        this.cdr.detectChanges();
      } else {
        // Detectar agotamiento de Tiingo (Captura de usuario: -11 req left)
        this.sourceExhausted['tiingo'] = true;
        this.savePersistence();
        this.step4AlphaVantage(apiSymbol, from, to);
      }
    });
  }

  private step4AlphaVantage(apiSymbol: string, from: string, to: string) {
    const avUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${this.alphaVantageApiKey}`;
    this.http.get(avUrl).pipe(timeout(10000), catchError(() => of(null))).subscribe((avRes: any) => {
      if (apiSymbol !== this.currentApiSymbol) return;
      const rate = avRes ? avRes['Realtime Currency Exchange Rate'] : null;
      if (rate && rate['5. Exchange Rate']) {
        this.currentPriceData = {
          ...this.currentPriceData,
          c: parseFloat(rate['5. Exchange Rate']),
          timestamp: new Date().getTime()
        };
        this.savePersistence();
        this.cdr.detectChanges();
      }
    });
  }

  // Versión ligera del fallback para el ticker (solo precio, con flujo estricto)
  fetchPriceOnlyFallback(apiSymbol: string, callback: (price: number) => void) {
    const cleanSymbol = apiSymbol.replace('/', '').toUpperCase();
    const [from, to] = apiSymbol.includes('/') ? apiSymbol.split('/') : [apiSymbol, 'USD'];

    // PASO 2: Polygon.io
    if (this.sourceExhausted['polygon']) {
      this.fetchStep3Tiingo(apiSymbol, from, to, callback);
      return;
    }

    const polygonUrl = apiSymbol.includes('/') 
      ? `https://api.polygon.io/v1/last/currencies/${from}/${to}?apiKey=${this.polygonApiKey}`
      : `https://api.polygon.io/v2/last/nbbo/${cleanSymbol}?apiKey=${this.polygonApiKey}`;

    this.http.get(polygonUrl).pipe(timeout(10000), catchError(() => of(null))).subscribe((data: any) => {
      const price = data?.last?.price || data?.results?.p;
      if (price) {
        callback(price);
      } else {
        if (data?.status === 'ERROR') this.sourceExhausted['polygon'] = true;
        this.fetchStep3Tiingo(apiSymbol, from, to, callback);
      }
    });
  }

  private fetchStep3Tiingo(apiSymbol: string, from: string, to: string, callback: (price: number) => void) {
    if (this.sourceExhausted['tiingo']) {
      this.fetchStep4AlphaVantage(from, to, callback);
      return;
    }

    const tiingoTicker = apiSymbol.includes('/') ? apiSymbol.replace('/', '').toLowerCase() : apiSymbol.toLowerCase();
    const tiingoUrl = apiSymbol.includes('/')
      ? `https://api.tiingo.com/tiingo/fx/${tiingoTicker}/top?token=${this.tiingoApiKey}`
      : `https://api.tiingo.com/tiingo/crypto/prices?tickers=${tiingoTicker}&token=${this.tiingoApiKey}`;
    
    this.http.get(tiingoUrl).pipe(timeout(10000), catchError(() => of(null))).subscribe((tData: any) => {
      const tPrice = tData && tData[0] ? (tData[0]?.midPrice || tData[0]?.lastPrice) : null;
      if (tPrice) {
        callback(tPrice);
      } else {
        this.sourceExhausted['tiingo'] = true;
        this.savePersistence();
        this.fetchStep4AlphaVantage(from, to, callback);
      }
    });
  }

  private fetchStep4AlphaVantage(from: string, to: string, callback: (price: number) => void) {
    const avUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${this.alphaVantageApiKey}`;
    this.http.get(avUrl).pipe(timeout(10000), catchError(() => of(null))).subscribe((avRes: any) => {
      const rate = avRes ? avRes['Realtime Currency Exchange Rate'] : null;
      if (rate && rate['5. Exchange Rate']) {
        callback(parseFloat(rate['5. Exchange Rate']));
      }
    });
  }

  loadGlobalSentiment() {
    this.http.get('https://api.alternative.me/fng/').subscribe((res: any) => {
      this.sentimentData = res.data[0];
      this.cdr.detectChanges();
    });
  }

  setNewsCategory(cat: string) {
    // Logic moved to MarketNewsComponent
  }

  filterNews() {
    // Logic moved to MarketNewsComponent
  }

  loadNews() {
    const rapidHeaders = {
      'x-rapidapi-key': this.rapidApiKey,
      'x-rapidapi-host': this.rapidApiHost
    };

    const sources = {
      finnhub: this.http.get(`https://finnhub.io/api/v1/news?category=general&token=${this.apiKey}`).pipe(catchError(() => of([]))),
      newsData: this.http.get(`https://newsdata.io/api/1/news?apikey=${this.newsDataKey}&q=finance&language=en`).pipe(catchError(() => of({ results: [] }))),
      marketaux: this.http.get(`https://api.marketaux.com/v1/news/all?language=en&api_token=${this.marketauxKey}`).pipe(catchError(() => of({ data: [] }))),
      tiingo: this.http.get(`https://api.tiingo.com/tiingo/news?token=${this.tiingoApiKey}`).pipe(catchError(() => of([]))),
      yahoo: this.http.get(`https://yahoo-finance15.p.rapidapi.com/api/v1/markets/news?ticker=AAPL,TSLA,BTC-USD,EURUSD=X`, { headers: rapidHeaders }).pipe(catchError(() => of({ body: [] })))
    };

    forkJoin(sources).subscribe((res: any) => {
      let combined: any[] = [];

      // Yahoo
      if (res.yahoo?.body) {
        combined = [...combined, ...res.yahoo.body.map((n: any) => ({
          headline: n.title,
          source: n.source || 'Yahoo Finance',
          datetime: new Date(n.pubDate).getTime() / 1000,
          image: null,
          url: n.link,
          summary: n.description,
          category: 'Stock Markets'
        }))];
      }

      // Finnhub
      if (Array.isArray(res.finnhub)) {
        combined = [...combined, ...res.finnhub.map((n: any) => ({
          headline: n.headline,
          source: n.source,
          datetime: n.datetime,
          image: n.image,
          url: n.url,
          summary: n.summary,
          category: 'Economy'
        }))];
      }

      // NewsData
      if (res.newsData?.results) {
        combined = [...combined, ...res.newsData.results.map((n: any) => ({
          headline: n.title,
          source: n.source_id,
          datetime: new Date(n.pubDate).getTime() / 1000,
          image: n.image_url,
          url: n.link,
          summary: n.description,
          category: 'Stock Markets'
        }))];
      }

      // Marketaux
      if (res.marketaux?.data) {
        combined = [...combined, ...res.marketaux.data.map((n: any) => ({
          headline: n.title,
          source: n.source,
          datetime: new Date(n.published_at).getTime() / 1000,
          image: n.image_url,
          url: n.link,
          summary: n.description,
          category: 'Currencies'
        }))];
      }

      // Tiingo
      if (Array.isArray(res.tiingo)) {
        combined = [...combined, ...res.tiingo.map((n: any) => ({
          headline: n.title,
          source: n.sourceName,
          datetime: new Date(n.publishedDate).getTime() / 1000,
          image: null,
          url: n.url,
          summary: n.description,
          category: 'Cryptocurrencies'
        }))];
      }

      // Ordenar y seleccionar los 10 mejores
      this.marketNews = combined
        .filter(n => this.isFinancialRelevant(n))
        .sort((a, b) => b.datetime - a.datetime)
        .slice(0, 10);

      this.cdr.detectChanges();
    });
  }

  private isFinancialRelevant(n: any): boolean {
    const text = (n.headline + ' ' + (n.summary || '')).toLowerCase();
    const blacklist = [
      'fruit', 'recipe', 'hello', 'prediction', 'wwe', 'backlash', 'show', 'entertainment',
      'lifestyle', 'travel', 'fashion', 'sport', 'football', 'soccer', 'celebrity'
    ];
    if (blacklist.some(word => text.includes(word))) return false;

    const whitelist = [
      'market', 'stock', 'invest', 'fed', 'bank', 'inflation', 'gdp', 'economy',
      'currency', 'forex', 'usd', 'eur', 'gold', 'oil', 'wti', 'commodit',
      'crypto', 'bitcoin', 'btc', 'eth', 'price', 'trade', 'finance', 'report',
      'earnings', 'dividend', 'share', 'bond', 'yield', 'rate', 'central bank',
      'wall street', 'nasdaq', 'sp 500', 'dow jones', 'recession'
    ];
    return whitelist.some(word => text.includes(word));
  }

  scrollNews(dir: number) {
    if (this.newsSlider) {
      const container = this.newsSlider.nativeElement;
      const scrollAmount = 310 * 3; // Item width (280) + gap (30) approx * 3
      container.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
    }
  }

  fetchCalendarData() {
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    this.http.get(`https://finnhub.io/api/v1/calendar/economic?from=${dateStr}&to=${dateStr}&token=${this.apiKey}`)
      .subscribe((res: any) => {
        this.economicEvents = (res.economicCalendar || []).map((event: any) => {
          const impactMap: { [key: string]: number } = { 'low': 1, 'med': 2, 'medium': 2, 'high': 3, 'none': 0 };
          
          let localTime = '--:--';
          if (event.time) {
            const utcDate = new Date(event.time + ' UTC');
            if (!isNaN(utcDate.getTime())) {
              localTime = utcDate.toLocaleTimeString(undefined, {
                hour: '2-digit', minute: '2-digit', hour12: true
              });
            }
          }

          return {
            ...event,
            localTime: localTime,
            impact: impactMap[event.impact?.toLowerCase()] || 0
          };
        });
        this.applyFilters();
        this.cdr.detectChanges();
      });
  }

  applyFilters() {
    this.filteredEvents = [...this.economicEvents].sort((a, b) => {
      if (b.impact !== a.impact) return b.impact - a.impact;
      return (a.time || '').localeCompare(b.time || '');
    });
  }

  loadTradingViewWidget(symbol: string): void {
    new TradingView.widget({
      "container_id": "tv_chart_container",
      "autosize": true,
      "symbol": symbol,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "light",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": false, 
      "header_widget_buttons": false,
      "top_toolbar": false,
      "details": false, 
      "hotlist": false,
      "calendar": false,
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650"
    });
  }

  changeDate(days: number) {
    this.selectedDate = new Date(this.selectedDate.setDate(this.selectedDate.getDate() + days));
    this.fetchCalendarData();
  }

  goToday() {
    this.selectedDate = new Date();
    this.fetchCalendarData();
  }

  openArticle(news: any) {
    this.pendingNewsArticle = {
      title: news.headline,
      snippet: news.summary ?? '',
      time: news.datetime * 1000,
      source: news.source ?? '',
      category: news.category ?? 'Economy',
      image: news.image ?? null,
      url: news.url ?? '',
      isPro: !!news.isPro
    };
    this.activeTab = 'news';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  clearPendingNewsArticle(): void {
    this.pendingNewsArticle = null;
  }
}
